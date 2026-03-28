import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

router = APIRouter(prefix="/ai", tags=["ai"])


class OcrResponse(BaseModel):
    success: bool
    text: str
    timestamp: str
    record_file: str


class AISettings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-v3.1:671b-cloud"
    ocr_model: str = "qwen3-vl:235b-cloud"
    ollama_timeout_seconds: int = 180
    max_image_size_mb: int = 10

    model_config = SettingsConfigDict(
        env_prefix="AI_CHATBOT_",
        env_file=str(Path(__file__).resolve().parents[5] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


ai_settings = AISettings()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


def _data_dir() -> Path:
    path = _repo_root() / "services" / "ai-imgtotext" / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _persist_ocr_result(payload: dict) -> Path:
    timestamp_compact = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file_path = _data_dir() / f"ocr_{timestamp_compact}_{uuid4().hex}.json"
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return file_path


def _is_vision_capable(show_payload: dict[str, Any]) -> bool:
    capabilities = show_payload.get("capabilities")
    if isinstance(capabilities, list) and "vision" in capabilities:
        return True
    return False


@router.post("/ocr/extract", response_model=OcrResponse)
async def extract_text_from_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")

    image_bytes = await file.read()
    image_size_mb = len(image_bytes) / (1024 * 1024)
    if image_size_mb > ai_settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Max allowed size is {ai_settings.max_image_size_mb} MB.",
        )

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    ollama_base_url = ai_settings.ollama_base_url
    ollama_model = ai_settings.ocr_model or ai_settings.ollama_model
    ollama_timeout_seconds = ai_settings.ollama_timeout_seconds

    request_payload = {
        "model": ollama_model,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an OCR specialist. Extract only visible text from the image with high fidelity. "
                    "Preserve line breaks and section order whenever possible. "
                    "Do not summarize, translate, rewrite, infer hidden text, or add explanations. "
                    "If no readable text is present, respond exactly with NO_TEXT_FOUND."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Read this image carefully and return the full extracted text exactly as it appears. "
                    "Keep the original structure as much as possible."
                ),
                "images": [encoded_image],
            },
        ],
        "options": {"temperature": 0},
    }

    try:
        async with httpx.AsyncClient(timeout=ollama_timeout_seconds) as client:
            show_response = await client.post(
                f"{ollama_base_url}/api/show",
                json={"model": ollama_model},
            )
            if show_response.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Ollama model lookup failed ({show_response.status_code}): {show_response.text}",
                )

            show_payload = show_response.json()
            if not _is_vision_capable(show_payload):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"OCR model '{ollama_model}' is not vision-capable. "
                        "Set AI_CHATBOT_OCR_MODEL to a vision model "
                        "(for example: qwen3-vl:235b-cloud, llava:13b, or llama3.2-vision)."
                    ),
                )

            response = await client.post(f"{ollama_base_url}/api/chat", json=request_payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Ollama: {exc}") from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama request failed ({response.status_code}): {response.text}",
        )

    data = response.json()
    extracted_text = (data.get("message", {}).get("content") or data.get("response") or "").strip()
    normalized_text = "" if extracted_text == "NO_TEXT_FOUND" else extracted_text

    ts = _utc_now_iso()
    record = {
        "id": uuid4().hex,
        "timestamp": ts,
        "model": ollama_model,
        "filename": file.filename,
        "content_type": file.content_type,
        "text": normalized_text,
    }
    saved_path = _persist_ocr_result(record)

    return OcrResponse(
        success=True,
        text=normalized_text,
        timestamp=ts,
        record_file=str(saved_path),
    )

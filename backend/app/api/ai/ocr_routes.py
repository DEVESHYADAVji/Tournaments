import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from openai import OpenAIError
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.ai_client import get_ai_client
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])


class OcrResponse(BaseModel):
    success: bool
    text: str
    timestamp: str
    record_file: str


class AISettings(BaseSettings):
    max_image_size_mb: int = 10

    model_config = SettingsConfigDict(
        env_prefix="AI_CHATBOT_",
        env_file=str(Path(__file__).resolve().parents[4] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


ai_settings = AISettings()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


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
    ocr_model = settings.AI_CHATBOT_OCR_MODEL
    messages = [
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
            "content": [
                {"type": "text", "text": "Read this image carefully and return the full extracted text exactly as it appears."},
                {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{encoded_image}"}},
            ],
        },
    ]

    try:
        response = await get_ai_client().chat.completions.create(
            model=ocr_model,
            messages=messages,
            temperature=0,
        )
        extracted_text = (response.choices[0].message.content or "").strip()
    except (OpenAIError, RuntimeError, IndexError) as exc:
        raise HTTPException(status_code=502, detail="Failed to connect to the AI service") from exc
    normalized_text = "" if extracted_text == "NO_TEXT_FOUND" else extracted_text

    ts = _utc_now_iso()
    record = {
        "id": uuid4().hex,
        "timestamp": ts,
        "model": ocr_model,
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

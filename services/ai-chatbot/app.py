import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from prompts import OCR_SYSTEM_PROMPT, OCR_USER_PROMPT
from settings import settings


app = FastAPI(title="AI Chatbot Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    success: bool
    reply: str
    timestamp: str


class OcrResponse(BaseModel):
    success: bool
    text: str
    timestamp: str
    record_file: str


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def persist_ocr_result(payload: Dict[str, Any]) -> Path:
    timestamp_compact = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file_path = settings.data_dir / f"ocr_{timestamp_compact}_{uuid4().hex}.json"
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return file_path


async def run_ollama_ocr(image_bytes: bytes) -> str:
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    ocr_model = settings.ocr_model or settings.ollama_model
    request_payload = {
        "model": ocr_model,
        "stream": False,
        "messages": [
            {"role": "system", "content": OCR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": OCR_USER_PROMPT,
                "images": [encoded_image],
            },
        ],
        "options": {
            "temperature": 0,
        },
    }

    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        show_response = await client.post(
            f"{settings.ollama_base_url}/api/show",
            json={"model": ocr_model},
        )
        if show_response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama model lookup failed ({show_response.status_code}): {show_response.text}",
            )
        show_payload = show_response.json()
        capabilities = show_payload.get("capabilities") or []
        if "vision" not in capabilities:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"OCR model '{ocr_model}' is not vision-capable. "
                    "Set AI_CHATBOT_OCR_MODEL to a vision model."
                ),
            )
        response = await client.post(f"{settings.ollama_base_url}/api/chat", json=request_payload)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama request failed ({response.status_code}): {response.text}",
        )

    data = response.json()
    content = (
        data.get("message", {}).get("content")
        or data.get("response")
        or ""
    )

    return content.strip()


@app.get("/", tags=["root"])
async def root():
    return {"service": "ai-chatbot", "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "time": utc_now_iso(),
        "model": settings.ollama_model,
        "ocr_model": settings.ocr_model,
        "ollama_base_url": settings.ollama_base_url,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """Return a real LLM reply for the provided text message."""
    ts = utc_now_iso()
    messages = [{"role": "user", "content": req.message}]

    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "stream": False,
                "messages": messages,
            },
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Ollama request failed: {response.text}")

    data = response.json()
    reply = data.get("message", {}).get("content") or data.get("response") or ""
    return ChatResponse(success=True, reply=reply.strip(), timestamp=ts)


@app.post("/ocr/extract", response_model=OcrResponse, tags=["ocr"])
async def extract_text_from_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")

    image_bytes = await file.read()
    image_size_mb = len(image_bytes) / (1024 * 1024)
    if image_size_mb > settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Max allowed size is {settings.max_image_size_mb} MB.",
        )

    try:
        extracted_text = await run_ollama_ocr(image_bytes)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Ollama: {exc}") from exc

    ts = utc_now_iso()
    normalized_text = "" if extracted_text == "NO_TEXT_FOUND" else extracted_text

    record = {
        "id": uuid4().hex,
        "timestamp": ts,
        "model": settings.ollama_model,
        "ocr_model": settings.ocr_model,
        "filename": file.filename,
        "content_type": file.content_type,
        "text": normalized_text,
    }
    saved_path = persist_ocr_result(record)

    return OcrResponse(
        success=True,
        text=normalized_text,
        timestamp=ts,
        record_file=str(saved_path),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)

import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .prompts import DOCUMENT_QA_SYSTEM_PROMPT, DOCUMENT_QA_USER_PROMPT_TEMPLATE
from .settings import settings

app = FastAPI(title="Help Chatbot Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store documents in memory (simple approach)
DOCUMENT_CONTEXT = ""
CURRENT_DOCUMENT_FILE = None


class DocumentUploadRequest(BaseModel):
    filename: str


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    success: bool
    answer: str
    timestamp: str
    source_document: Optional[str] = None


class DocumentResponse(BaseModel):
    success: bool
    message: str
    filename: str
    timestamp: str


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using Ollama with vision capability"""
    # For simple text extraction, we'll use a basic approach
    # In production, consider using PyPDF2 or similar
    try:
        import PyPDF2
        from io import BytesIO
        
        pdf_file = BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except ImportError:
        # Fallback: use Ollama's vision capability to process PDF images
        return "PDF extraction requires PyPDF2. Please install it."
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {str(e)}")


def extract_text_from_word(doc_bytes: bytes) -> str:
    """Extract text from Word document"""
    try:
        from docx import Document
        from io import BytesIO
        
        doc = Document(BytesIO(doc_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except ImportError:
        return "DOCX extraction requires python-docx. Please install it."
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract Word text: {str(e)}")


def extract_text_from_file(file_bytes: bytes, content_type: str) -> str:
    """Extract text based on file type"""
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                         "application/msword"]:
        return extract_text_from_word(file_bytes)
    elif content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use PDF, DOCX, or TXT."
        )


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks"""
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def find_relevant_chunks(query: str, chunks: List[str], similarity_threshold: float = 0.3) -> str:
    """Find relevant chunks using simple keyword matching"""
    query_words = set(query.lower().split())
    
    scored_chunks = []
    for chunk in chunks:
        chunk_words = set(chunk.lower().split()[:50])  # Use first 50 words for matching
        common_words = query_words & chunk_words
        if common_words:
            score = len(common_words) / len(query_words)
            if score >= similarity_threshold:
                scored_chunks.append((score, chunk))
    
    # Sort by score and combine top chunks
    scored_chunks.sort(reverse=True)
    relevant_text = "\n\n".join([chunk for _, chunk in scored_chunks[:3]])  # Top 3 chunks
    
    return relevant_text if relevant_text else "\n".join(chunks[:2])


async def query_ollama(system_prompt: str, user_message: str) -> str:
    """Query Ollama with low temperature for factual responses"""
    request_payload = {
        "model": settings.ollama_model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "options": {
            "temperature": 0.1,  # Very low temperature for factual accuracy
            "top_p": 0.9,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json=request_payload,
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama request failed ({response.status_code}): {response.text}",
            )

        data = response.json()
        answer = (
            data.get("message", {}).get("content")
            or data.get("response")
            or ""
        )
        return answer.strip()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Ollama: {exc}")


@app.get("/", tags=["root"])
async def root():
    return {"service": "help-chatbot", "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    global CURRENT_DOCUMENT_FILE
    return {
        "status": "ok",
        "time": utc_now_iso(),
        "model": settings.ollama_model,
        "ollama_base_url": settings.ollama_base_url,
        "document_loaded": CURRENT_DOCUMENT_FILE is not None,
        "current_document": CURRENT_DOCUMENT_FILE,
    }


@app.post("/upload-document", response_model=DocumentResponse, tags=["document"])
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document for QA"""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE
    
    if not file.content_type:
        raise HTTPException(status_code=400, detail="File content type is required")

    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use PDF, DOCX, or TXT.",
        )

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    
    if file_size_mb > settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max allowed size is {settings.max_image_size_mb} MB.",
        )

    try:
        DOCUMENT_CONTEXT = extract_text_from_file(file_bytes, file.content_type)
        CURRENT_DOCUMENT_FILE = file.filename
        
        return DocumentResponse(
            success=True,
            message=f"Document '{file.filename}' uploaded and processed successfully",
            filename=file.filename,
            timestamp=utc_now_iso(),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to process document: {str(exc)}")


@app.post("/ask", response_model=ChatResponse, tags=["chat"])
async def ask_question(req: ChatRequest):
    """Ask a question based on the uploaded document"""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE
    
    if not DOCUMENT_CONTEXT:
        raise HTTPException(
            status_code=400,
            detail="No document uploaded. Please upload a document first.",
        )

    try:
        # Find relevant chunks
        chunks = chunk_text(DOCUMENT_CONTEXT)
        relevant_context = find_relevant_chunks(req.question, chunks)

        # Prepare prompt
        user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
            context=relevant_context,
            question=req.question,
        )

        # Get answer from Ollama
        answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)

        return ChatResponse(
            success=True,
            answer=answer,
            timestamp=utc_now_iso(),
            source_document=CURRENT_DOCUMENT_FILE,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {str(exc)}")


@app.post("/clear-document", tags=["document"])
async def clear_document():
    """Clear the current document from memory"""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE
    
    DOCUMENT_CONTEXT = ""
    CURRENT_DOCUMENT_FILE = None
    
    return {"success": True, "message": "Document cleared"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)

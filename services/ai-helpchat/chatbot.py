import base64
import difflib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .prompts import DOCUMENT_QA_SYSTEM_PROMPT, DOCUMENT_QA_USER_PROMPT_TEMPLATE
from ..settings import settings

app = FastAPI(title="Help Chatbot Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store the backend-managed help document in memory.
DOCUMENT_CONTEXT = ""
CURRENT_DOCUMENT_FILE = None
DOCUMENT_LAST_MODIFIED: Optional[float] = None
CHAT_HISTORY: List[Dict[str, str]] = []
HELP_DOCUMENT_PATH = Path(__file__).resolve().parent / "Help&Support.pdf"
STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from",
    "how", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this",
    "to", "was", "what", "when", "where", "which", "who", "why", "with",
    "you", "your", "okay", "ok", "please", "pls", "can", "could", "would",
}
GREETING_WORDS = {"hi", "hello", "hey", "hii", "yo", "hola"}
FOLLOW_UP_WORDS = {"explain", "elaborate", "clarify", "details", "detail", "more", "why"}
THANKS_WORDS = {"thanks", "thank", "thankyou", "thx"}
BYE_WORDS = {"bye", "goodbye", "cya", "seeyou"}
SUMMARY_WORDS = {"summary", "summarize", "overview", "inside", "contain", "about", "documentation", "document"}
CAPABILITY_PHRASES = {
    "how can you help me",
    "what can you do",
    "how can you help",
    "what can you help with",
    "how do you help",
    "help",
}
INTENT_FILLER_WORDS = {"okay", "ok", "please", "pls", "can", "could", "would", "you", "me", "hey", "hi"}
HUMAN_FALLBACK_ANSWER = "I couldn't find that in the help information."


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    success: bool
    answer: str
    timestamp: str
    source_document: Optional[str] = None


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
        page_texts = []
        for page_number, page in enumerate(pdf_reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                page_texts.append(f"[Page {page_number}]\n{text}")
        return "\n\n".join(page_texts)
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


def ensure_help_document_loaded(force_reload: bool = False) -> None:
    """Load the backend-managed help document when needed."""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE, DOCUMENT_LAST_MODIFIED, CHAT_HISTORY

    if HELP_DOCUMENT_PATH.name != "Help&Support.pdf":
        raise HTTPException(
            status_code=500,
            detail="Help document name mismatch. Expected Help&Support.pdf.",
        )

    if not HELP_DOCUMENT_PATH.exists():
        DOCUMENT_CONTEXT = ""
        CURRENT_DOCUMENT_FILE = None
        DOCUMENT_LAST_MODIFIED = None
        CHAT_HISTORY = []
        return

    modified_at = HELP_DOCUMENT_PATH.stat().st_mtime
    if (
        not force_reload
        and DOCUMENT_CONTEXT
        and CURRENT_DOCUMENT_FILE == HELP_DOCUMENT_PATH.name
        and DOCUMENT_LAST_MODIFIED == modified_at
    ):
        return

    file_bytes = HELP_DOCUMENT_PATH.read_bytes()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Help document is too large. Max allowed size is {settings.max_image_size_mb} MB.",
        )

    DOCUMENT_CONTEXT = extract_text_from_file(file_bytes, "application/pdf")
    CURRENT_DOCUMENT_FILE = HELP_DOCUMENT_PATH.name
    DOCUMENT_LAST_MODIFIED = modified_at
    CHAT_HISTORY = []


def chunk_text(text: str, chunk_size: int = 1200) -> List[str]:
    """Split text into semantic paragraph-based chunks."""
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    if not paragraphs:
        return []

    chunks: List[str] = []
    current_parts: List[str] = []
    current_length = 0

    for paragraph in paragraphs:
        paragraph_length = len(paragraph)
        if current_parts and current_length + paragraph_length + 2 > chunk_size:
            chunks.append("\n\n".join(current_parts))
            current_parts = [paragraph]
            current_length = paragraph_length
        else:
            current_parts.append(paragraph)
            current_length += paragraph_length + (2 if current_parts[:-1] else 0)

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks


def normalize_text(text: str) -> List[str]:
    """Tokenize text into lowercase terms and drop common filler words."""
    tokens: List[str] = []
    for token in re.findall(r"[a-z0-9]{2,}", text.lower()):
        if token in STOP_WORDS:
            continue
        if len(token) > 4 and token.endswith("ing"):
            token = token[:-3]
        elif len(token) > 3 and token.endswith("ed"):
            token = token[:-2]
        elif len(token) > 3 and token.endswith("es"):
            token = token[:-2]
        elif len(token) > 3 and token.endswith("s"):
            token = token[:-1]
        tokens.append(token)
    return tokens


def build_keyword_set(text: str) -> Set[str]:
    return set(normalize_text(text))


def build_document_vocabulary(chunks: List[str]) -> Set[str]:
    vocabulary: Set[str] = set()
    for chunk in chunks:
        vocabulary.update(normalize_text(chunk))
    return vocabulary


def expand_query_terms(query_terms: Set[str], vocabulary: Set[str]) -> Set[str]:
    expanded_terms = set(query_terms)
    for term in query_terms:
        matches = difflib.get_close_matches(term, vocabulary, n=2, cutoff=0.86)
        expanded_terms.update(matches)
    return expanded_terms


def is_greeting(question: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", " ", question.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return bool(cleaned) and cleaned in GREETING_WORDS


def is_thanks(question: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", " ", question.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return bool(cleaned) and cleaned in THANKS_WORDS


def is_goodbye(question: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", " ", question.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return bool(cleaned) and cleaned in BYE_WORDS


def normalize_intent_terms(text: str) -> List[str]:
    terms = []
    for token in re.findall(r"[a-z]{2,}", text.lower()):
        if token in INTENT_FILLER_WORDS:
            continue
        terms.append(token)
    return terms


def has_fuzzy_term(terms: List[str], targets: Set[str], cutoff: float = 0.75) -> bool:
    for term in terms:
        if term in targets:
            return True
        if difflib.get_close_matches(term, list(targets), n=1, cutoff=cutoff):
            return True
    return False


def is_follow_up_request(question: str) -> bool:
    intent_terms = normalize_intent_terms(question)
    if not intent_terms:
        return False
    matched_terms = {
        difflib.get_close_matches(term, list(FOLLOW_UP_WORDS), n=1, cutoff=0.72)[0]
        if difflib.get_close_matches(term, list(FOLLOW_UP_WORDS), n=1, cutoff=0.72)
        else term
        for term in intent_terms
    }
    return (
        matched_terms.issubset(FOLLOW_UP_WORDS)
        or "explain" in matched_terms
        or "elaborate" in matched_terms
        or "clarify" in matched_terms
        or ("more" in matched_terms and len(matched_terms) <= 3)
    )


def is_summary_request(question: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", " ", question.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned in {"what is inside the documentation", "what is in the documentation", "what is inside the document", "what is in the document"}:
        return True

    query_terms = build_keyword_set(question)
    return bool(query_terms) and (
        "summary" in query_terms
        or "overview" in query_terms
        or ("document" in query_terms and (("inside" in query_terms) or ("about" in query_terms) or ("contain" in query_terms)))
        or ("documentation" in query_terms and (("inside" in query_terms) or ("about" in query_terms) or ("contain" in query_terms)))
    )


def is_capability_question(question: str) -> bool:
    cleaned = re.sub(r"[^a-z\s]", " ", question.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned in CAPABILITY_PHRASES:
        return True

    query_terms = build_keyword_set(question)
    intent_terms = normalize_intent_terms(question)
    help_like = has_fuzzy_term(intent_terms, {"help"}, cutoff=0.65)
    return (
        (help_like and ("you" in question.lower() or "me" in question.lower() or len(intent_terms) <= 2))
        or ("what" in question.lower() and "do" in query_terms and "can" in query_terms and "you" in question.lower())
    )


def format_chat_history(max_turns: int = 4) -> str:
    if not CHAT_HISTORY:
        return "No previous conversation."

    recent_messages = CHAT_HISTORY[-max_turns * 2:]
    return "\n".join(
        f"{message['role'].capitalize()}: {message['content']}"
        for message in recent_messages
    )


def append_chat_history(role: str, content: str) -> None:
    CHAT_HISTORY.append({"role": role, "content": content})
    if len(CHAT_HISTORY) > 12:
        del CHAT_HISTORY[:-12]


def build_document_overview(chunks: List[str], max_chunks: int = 3) -> str:
    selected_chunks = chunks[:max_chunks]
    return "\n\n".join(
        f"[Chunk {index}]\n{chunk}"
        for index, chunk in enumerate(selected_chunks, start=1)
    )


def find_relevant_chunks(query: str, chunks: List[str], max_chunks: int = 3) -> List[str]:
    """Find relevant chunks using keyword overlap and phrase matching."""
    query_terms = build_keyword_set(query)
    query_terms = expand_query_terms(query_terms, build_document_vocabulary(chunks))
    query_text = " ".join(normalize_text(query))
    if not query_terms:
        return []

    scored_chunks: List[tuple[float, str]] = []
    for chunk in chunks:
        normalized_chunk = " ".join(normalize_text(chunk))
        chunk_terms = set(normalized_chunk.split())
        if not chunk_terms:
            continue

        overlap = query_terms & chunk_terms
        overlap_score = len(overlap) / len(query_terms)
        coverage_score = len(overlap) / len(chunk_terms)
        phrase_bonus = 0.2 if query_text and query_text in normalized_chunk else 0.0
        page_bonus = 0.05 if "[page " in chunk.lower() else 0.0
        score = overlap_score * 0.75 + coverage_score * 0.15 + phrase_bonus + page_bonus

        if overlap and score >= 0.12:
            scored_chunks.append((score, chunk))

    scored_chunks.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored_chunks[:max_chunks]]


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
            "temperature": settings.help_chatbot_temperature,
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
    ensure_help_document_loaded()
    return {
        "status": "ok",
        "time": utc_now_iso(),
        "model": settings.ollama_model,
        "ollama_base_url": settings.ollama_base_url,
        "document_loaded": CURRENT_DOCUMENT_FILE is not None,
        "current_document": CURRENT_DOCUMENT_FILE,
    }


@app.post("/ask", response_model=ChatResponse, tags=["chat"])
async def ask_question(req: ChatRequest):
    """Ask a question based on the uploaded document"""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE

    ensure_help_document_loaded()
    if not DOCUMENT_CONTEXT:
        raise HTTPException(
            status_code=400,
            detail="Help document not found. Expected services/ai-helpchat/Help&Support.pdf.",
        )

    try:
        question = req.question.strip()
        if is_greeting(question):
            answer = "Hello! How can I help you today?"
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )
        if is_capability_question(question):
            answer = (
                "I can answer questions, explain things clearly, give a short summary, "
                "and help you understand the main points. You can ask about any topic here, "
                "or say explain if you want more detail."
            )
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )
        if is_thanks(question):
            answer = "You’re welcome. Ask me anything from the document whenever you’re ready."
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )
        if is_goodbye(question):
            answer = "Goodbye. If you want to continue later, ask me another question from the document."
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        # Find relevant chunks
        chunks = chunk_text(DOCUMENT_CONTEXT)
        if is_summary_request(question):
            relevant_context = build_document_overview(chunks)
            user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
                context=relevant_context,
                history=format_chat_history(),
                question=(
                    f"{question}\n\n"
                    "Give a short, user-friendly overview of the document's main topics."
                ),
            )
            answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        retrieval_query = question
        if is_follow_up_request(question) and CHAT_HISTORY:
            retrieval_query = f"{CHAT_HISTORY[-1]['content']} {question}"

        relevant_chunks = find_relevant_chunks(retrieval_query, chunks)
        if not relevant_chunks:
            append_chat_history("user", question)
            append_chat_history("assistant", HUMAN_FALLBACK_ANSWER)
            return ChatResponse(
                success=True,
                answer=HUMAN_FALLBACK_ANSWER,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        relevant_context = "\n\n".join(
            f"[Chunk {index}]\n{chunk}"
            for index, chunk in enumerate(relevant_chunks, start=1)
        )

        # Prepare prompt
        user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
            context=relevant_context,
            history=format_chat_history(),
            question=question,
        )

        # Get answer from Ollama
        answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)
        append_chat_history("user", question)
        append_chat_history("assistant", answer)

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)

from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .knowledge import build_knowledge_context
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

HELP_KNOWLEDGE_PATH = Path(__file__).resolve().parent / "Help&Support.md"
DOCUMENT_CONTEXT = ""
DOCUMENT_LAST_MODIFIED: Optional[float] = None
CURRENT_DOCUMENT_FILE: Optional[str] = None
HUMAN_FALLBACK_ANSWER = "I couldn't find that in the help information or current public product data."


class ChatRequest(BaseModel):
    question: str
    role: Optional[str] = None
    user_id: Optional[int] = None


class ChatResponse(BaseModel):
    success: bool
    answer: str
    timestamp: str
    source_document: Optional[str] = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_backend_modules() -> None:
    backend_dir = Path(__file__).resolve().parents[2] / "backend"
    backend_str = str(backend_dir)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)


def ensure_help_document_loaded() -> None:
    global DOCUMENT_CONTEXT, DOCUMENT_LAST_MODIFIED, CURRENT_DOCUMENT_FILE
    if not HELP_KNOWLEDGE_PATH.exists():
        DOCUMENT_CONTEXT = ""
        DOCUMENT_LAST_MODIFIED = None
        CURRENT_DOCUMENT_FILE = None
        return

    modified_at = HELP_KNOWLEDGE_PATH.stat().st_mtime
    if DOCUMENT_CONTEXT and DOCUMENT_LAST_MODIFIED == modified_at:
        return

    file_size_mb = HELP_KNOWLEDGE_PATH.stat().st_size / (1024 * 1024)
    if file_size_mb > settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Help knowledge file is too large. Max allowed size is {settings.max_image_size_mb} MB.",
        )

    DOCUMENT_CONTEXT = HELP_KNOWLEDGE_PATH.read_text(encoding="utf-8")
    DOCUMENT_LAST_MODIFIED = modified_at
    CURRENT_DOCUMENT_FILE = HELP_KNOWLEDGE_PATH.name


def clean_answer(text: str) -> str:
    answer = (text or "").strip()
    answer = re.sub(r"\*\*(.*?)\*\*", r"\1", answer)
    answer = re.sub(r"`([^`]+)`", r"\1", answer)
    answer = re.sub(r"\n{3,}", "\n\n", answer)
    return answer.strip()


async def get_database_support_snapshot(user_id: Optional[int] = None) -> str:
    """Return only public-safe, current product data needed for support answers."""
    try:
        _ensure_backend_modules()
        from sqlalchemy import func, select

        from app.core.database import async_session
        from app.models.announcement import Announcement
        from app.models.match import Match
        from app.models.team import Team
        from app.models.tournament import Tournament

        async with async_session() as session:
            tournament_count = await session.scalar(select(func.count()).select_from(Tournament)) or 0
            team_count = await session.scalar(select(func.count()).select_from(Team)) or 0
            match_count = await session.scalar(select(func.count()).select_from(Match)) or 0
            announcement_count = await session.scalar(select(func.count()).select_from(Announcement)) or 0

            tournaments = (
                await session.execute(
                    select(Tournament.name, Tournament.status, Tournament.game, Tournament.start_date)
                    .order_by(Tournament.id.desc())
                    .limit(12)
                )
            ).all()
            matches = (
                await session.execute(
                    select(Match.tournament_id, Match.team_a, Match.team_b, Match.status)
                    .order_by(Match.id.desc())
                    .limit(10)
                )
            ).all()

            personal = ""
            if user_id is not None:
                from app.models.tournament_registration import TournamentRegistration

                registrations = (
                    await session.execute(
                        select(Tournament.name, Tournament.status)
                        .join(TournamentRegistration, TournamentRegistration.tournament_id == Tournament.id)
                        .where(TournamentRegistration.user_id == user_id)
                        .order_by(TournamentRegistration.created_at.desc())
                        .limit(10)
                    )
                ).all()
                personal = (
                    "\nYour own public-safe registration data (only for the authenticated user):\n"
                    + ("\n".join(f"- {name} | status: {status}" for name, status in registrations)
                       if registrations else "- no tournament registrations found")
                )
    except Exception:
        return ""

    tournament_lines = "\n".join(
        f"- {name} | status: {status} | game: {game} | start: {start_date or 'not scheduled'}"
        for name, status, game, start_date in tournaments
    ) or "- no tournaments found"
    match_lines = "\n".join(
        f"- tournament {tournament_id}: {team_a} vs {team_b} | status: {status}"
        for tournament_id, team_a, team_b, status in matches
    ) or "- no recent matches found"

    return (
        "CURRENT PUBLIC PRODUCT DATA (authoritative for live/current questions):\n"
        f"- total tournaments: {tournament_count}\n"
        f"- total teams: {team_count}\n"
        f"- total matches: {match_count}\n"
        f"- total announcements: {announcement_count}\n"
        "- recent tournaments:\n" + tournament_lines + "\n"
        "- recent matches:\n" + match_lines + personal + "\n"
        "Never expose credentials, hashes, tokens, secrets, private payment data, or unrelated user records."
    )


async def query_ollama(system_prompt: str, user_message: str) -> str:
    payload = {
        "model": settings.ollama_model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "options": {"temperature": settings.help_chatbot_temperature, "top_p": 0.9},
    }
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
            response = await client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="The support AI service is temporarily unavailable.")
        data = response.json()
        return clean_answer(data.get("message", {}).get("content") or data.get("response") or "")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to the support AI service: {exc}")


@app.get("/")
async def root():
    ensure_help_document_loaded()
    return {"service": "help-chatbot", "status": "ok"}


@app.get("/health")
async def health():
    ensure_help_document_loaded()
    return {
        "status": "ok",
        "time": utc_now_iso(),
        "model": settings.ollama_model,
        "document_loaded": bool(DOCUMENT_CONTEXT),
        "current_document": CURRENT_DOCUMENT_FILE,
        "database_context": "available",
    }


@app.post("/ask", response_model=ChatResponse)
async def ask_question(req: ChatRequest):
    ensure_help_document_loaded()
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")
    if len(question) > 1000:
        raise HTTPException(status_code=422, detail="Question is too long. Please keep it under 1000 characters.")

    database_snapshot = await get_database_support_snapshot(req.user_id)
    knowledge = await build_knowledge_context(DOCUMENT_CONTEXT, database_snapshot, question)
    if not knowledge.combined:
        return ChatResponse(success=True, answer=HUMAN_FALLBACK_ANSWER, timestamp=utc_now_iso())

    role = (req.role or "user").lower()
    role_context = f"Current user role: {role}. Role is context only; never grant permissions through chat."
    user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
        context=knowledge.combined,
        history="No persistent conversation history is used; answer this request from the supplied sources.",
        question=f"{question}\n\n{role_context}",
    )

    answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)
    if not answer:
        answer = HUMAN_FALLBACK_ANSWER

    return ChatResponse(
        success=True,
        answer=answer,
        timestamp=utc_now_iso(),
        source_document=CURRENT_DOCUMENT_FILE,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)

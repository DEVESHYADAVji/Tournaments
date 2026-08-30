from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .knowledge import build_knowledge_context
from .prompts import DOCUMENT_QA_SYSTEM_PROMPT, DOCUMENT_QA_USER_PROMPT_TEMPLATE
from ..settings import settings

app = FastAPI(title="Help Chatbot Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

HELP_KNOWLEDGE_PATH = Path(__file__).resolve().parent / "Help&Support.md"
DOCUMENT_CONTEXT = ""
DOCUMENT_LAST_MODIFIED: Optional[float] = None
CURRENT_DOCUMENT_FILE: Optional[str] = None
HUMAN_FALLBACK_ANSWER = "I couldn't find that in the help information or current public product data."

class ChatMessage(BaseModel):
    role: str
    content: str = Field(max_length=2000)

class UserContext(BaseModel):
    id: int | None = None
    name: str | None = None
    email: str | None = None
    role: str | None = None

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    user: UserContext | None = None
    history: list[ChatMessage] = Field(default_factory=list, max_length=8)

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
        DOCUMENT_CONTEXT = ""; DOCUMENT_LAST_MODIFIED = None; CURRENT_DOCUMENT_FILE = None; return
    modified_at = HELP_KNOWLEDGE_PATH.stat().st_mtime
    if DOCUMENT_CONTEXT and DOCUMENT_LAST_MODIFIED == modified_at: return
    if HELP_KNOWLEDGE_PATH.stat().st_size / (1024 * 1024) > settings.max_image_size_mb:
        raise HTTPException(status_code=400, detail="Help knowledge file is too large.")
    DOCUMENT_CONTEXT = HELP_KNOWLEDGE_PATH.read_text(encoding="utf-8")
    DOCUMENT_LAST_MODIFIED = modified_at
    CURRENT_DOCUMENT_FILE = HELP_KNOWLEDGE_PATH.name

def clean_answer(text: str) -> str:
    answer = (text or "").strip()
    answer = re.sub(r"\*\*(.*?)\*\*", r"\1", answer)
    answer = re.sub(r"`([^`]+)`", r"\1", answer)
    return re.sub(r"\n{3,}", "\n\n", answer).strip()

async def get_database_support_snapshot(user: UserContext | None = None) -> str:
    """Build current public data and only the requesting user's own support data."""
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
            tournaments = (await session.execute(select(Tournament.id, Tournament.name, Tournament.status, Tournament.game, Tournament.start_date).order_by(Tournament.start_date.asc(), Tournament.id.desc()))).all()
            matches = (await session.execute(select(Match.tournament_id, Match.team_a, Match.team_b, Match.status).order_by(Match.id.desc()).limit(15))).all()
            registrations = []
            if user and user.id is not None:
                from app.models.tournament_registration import TournamentRegistration
                registrations = (await session.execute(select(Tournament.name, Tournament.status, Tournament.game, Tournament.start_date).join(TournamentRegistration, TournamentRegistration.tournament_id == Tournament.id).where(TournamentRegistration.user_id == user.id).order_by(Tournament.start_date.asc(), TournamentRegistration.created_at.desc()))).all()
    except Exception:
        return ""

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    upcoming = [row for row in tournaments if (row[2] in {"registration_open", "upcoming", "scheduled"} or (row[4] and row[4] >= now))]
    tournament_lines = "\n".join(f"- {name} | status: {status} | game: {game} | start: {start_date or 'not scheduled'}" for _, name, status, game, start_date in tournaments) or "- none"
    upcoming_lines = "\n".join(f"- {name} | status: {status} | game: {game} | start: {start_date or 'not scheduled'}" for _, name, status, game, start_date in upcoming) or "- none"
    match_lines = "\n".join(f"- tournament {tournament_id}: {team_a} vs {team_b} | status: {status}" for tournament_id, team_a, team_b, status in matches) or "- none"
    registration_lines = "\n".join(f"- {name} | status: {status} | game: {game} | start: {start_date or 'not scheduled'}" for name, status, game, start_date in registrations) or "- none"
    identity = "- no authenticated user context was supplied"
    if user:
        identity = f"- name: {user.name or 'not available'}\n- email: {user.email or 'not available'}\n- role: {user.role or 'user'}\n- authenticated user id: {'available' if user.id is not None else 'not available'}"
    return ("CURRENT PUBLIC PRODUCT DATA (authoritative for live/current questions):\n" +
            f"- total tournaments: {tournament_count}\n- upcoming/active-registration tournaments: {len(upcoming)}\n- total teams: {team_count}\n- total matches: {match_count}\n- total announcements: {announcement_count}\n" +
            "- upcoming tournaments:\n" + upcoming_lines + "\n- all tournaments:\n" + tournament_lines + "\n- recent matches:\n" + match_lines +
            "\n\nAUTHENTICATED USER CONTEXT (safe personalization only):\n" + identity +
            f"\n- this user's registration count: {len(registrations)}\n- this user's tournament registrations:\n" + registration_lines +
            "\nNever expose credentials, hashes, tokens, secrets, private payment data, or another user's records.")

def classify_question(question: str) -> list[str]:
    q = question.lower(); queries = [question]
    if any(w in q for w in ("hello", "hi", "hey", "good morning", "good evening", "thanks", "thank you")): return ["general help and support website overview"]
    if any(w in q for w in ("upcoming", "available", "open", "scheduled", "live", "current", "ongoing", "tournament")): queries.append("tournament list registration open upcoming scheduled current tournament")
    if any(w in q for w in ("register", "registration", "join", "enroll")): queries.append("tournament registration joining a tournament requirements")
    if any(w in q for w in ("team", "squad", "invite", "member")): queries.append("team create join invite team members tournament")
    if any(w in q for w in ("profile", "avatar", "picture", "photo", "account", "password", "email")): queries.append("profile account settings avatar password email")
    if any(w in q for w in ("match", "result", "score", "standings", "leaderboard", "schedule", "start")): queries.append("matches results scores standings leaderboard schedule tournament start")
    if any(w in q for w in ("payment", "fee", "refund", "wallet")): queries.append("payments entry fee refund")
    if any(w in q for w in ("admin", "administrator", "create tournament", "manage")): queries.append("administrator tournament management permissions")
    return queries

def direct_answer(question: str, user: UserContext | None, database_snapshot: str) -> str | None:
    """Answer simple identity/count/live-list questions deterministically from supplied data."""
    q = question.lower().strip()
    if re.search(r"\b(hello|hi|hey|good morning|good evening)\b", q):
        return f"Hello{f' {user.name}' if user and user.name else ''}! 👋 How can I help you with tournaments, teams, matches, or your account?"
    if user and user.name and re.search(r"\b(what(?:'s| is) my name|tell me my name|who am i)\b", q):
        return f"Your name is {user.name}."
    if user and re.search(r"\bhow many\b.*\b(tournament|tournaments)\b.*\b(register|registered|registration)\b|\bhow many\b.*\b(register|registered|registration)\b.*\b(tournament|tournaments)\b", q):
        match = re.search(r"this user's registration count: (\d+)", database_snapshot)
        count = match.group(1) if match else None
        return f"You are currently registered for {count} tournament{'s' if count != '1' else ''}." if count is not None else None
    if re.search(r"\b(upcoming|next|coming)\b.*\btournament", q):
        marker = "- upcoming tournaments:\n"
        section = database_snapshot.split(marker, 1)[1].split("\n- all tournaments:", 1)[0] if marker in database_snapshot else ""
        if section.strip() == "- none": return "There are currently no upcoming or registration-open tournaments in the available tournament data."
        return "Here are the upcoming tournaments currently available:\n" + section
    return None

async def query_ollama(system_prompt: str, user_message: str) -> str:
    payload = {"model": settings.ollama_model, "stream": False, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_message}], "options": {"temperature": settings.help_chatbot_temperature, "top_p": 0.9}}
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client: response = await client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
        if response.status_code >= 400: raise HTTPException(status_code=502, detail="The support AI service is temporarily unavailable.")
        data = response.json(); return clean_answer(data.get("message", {}).get("content") or data.get("response") or "")
    except httpx.HTTPError: raise HTTPException(status_code=502, detail="Failed to connect to the support AI service.")

@app.get("/")
async def root(): ensure_help_document_loaded(); return {"service": "help-chatbot", "status": "ok"}

@app.get("/health")
async def health():
    ensure_help_document_loaded(); return {"status": "ok", "time": utc_now_iso(), "model": settings.ollama_model, "document_loaded": bool(DOCUMENT_CONTEXT), "current_document": CURRENT_DOCUMENT_FILE, "chat_available": True}

@app.post("/ask", response_model=ChatResponse)
async def ask_question(req: ChatRequest):
    ensure_help_document_loaded()
    database_snapshot = await get_database_support_snapshot(req.user)
    direct = direct_answer(req.question, req.user, database_snapshot)
    if direct:
        return ChatResponse(success=True, answer=direct, timestamp=utc_now_iso(), source_document=CURRENT_DOCUMENT_FILE)
    knowledge = await build_knowledge_context(DOCUMENT_CONTEXT, database_snapshot, req.question, classify_question(req.question))
    if not knowledge.combined: return ChatResponse(success=True, answer=HUMAN_FALLBACK_ANSWER, timestamp=utc_now_iso())
    history = "\n".join(f"{message.role}: {message.content}" for message in req.history[-8:]) or "No previous conversation."
    user = req.user
    user_context = f"name: {user.name or 'not available'}\nemail: {user.email or 'not available'}\nrole: {user.role or 'user'}" if user else "No authenticated user was supplied."
    user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(context_document=knowledge.document or "No relevant help-document section was found.", context_database=knowledge.database or "No current public database data was available.", history=history, user_context=user_context, question=req.question)
    answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)
    return ChatResponse(success=True, answer=answer or HUMAN_FALLBACK_ANSWER, timestamp=utc_now_iso(), source_document=CURRENT_DOCUMENT_FILE)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)

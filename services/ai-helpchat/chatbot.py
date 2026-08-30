import difflib
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set

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

DOCUMENT_CONTEXT = ""
CURRENT_DOCUMENT_FILE = None
DOCUMENT_LAST_MODIFIED: Optional[float] = None
CHAT_HISTORY: List[Dict[str, str]] = []
HELP_KNOWLEDGE_PATH = Path(__file__).resolve().parent / "Help&Support.md"
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


async def get_database_support_snapshot() -> str:
    """Collect public-safe database facts for support answers."""
    try:
        _ensure_backend_modules()
        from sqlalchemy import func, select

        from app.core.database import async_session
        from app.models.announcement import Announcement
        from app.models.match import Match
        from app.models.team import Team
        from app.models.tournament import Tournament
        from app.models.user import User

        async with async_session() as session:
            tournament_count = await session.scalar(select(func.count()).select_from(Tournament)) or 0
            team_count = await session.scalar(select(func.count()).select_from(Team)) or 0
            match_count = await session.scalar(select(func.count()).select_from(Match)) or 0
            user_count = await session.scalar(select(func.count()).select_from(User)) or 0
            announcement_count = await session.scalar(select(func.count()).select_from(Announcement)) or 0

            recent_tournaments = await session.execute(
                select(Tournament.name, Tournament.status, Tournament.game)
                .order_by(Tournament.id.desc())
                .limit(5)
            )
            status_rows = recent_tournaments.all()

            recent_matches = await session.execute(
                select(Match.tournament_id, Match.team_a, Match.team_b, Match.status)
                .order_by(Match.id.desc())
                .limit(5)
            )
            match_rows = recent_matches.all()
    except Exception:
        return ""

    tournament_lines = [
        f"- {name} | status: {status} | game: {game}"
        for name, status, game in status_rows
    ] if status_rows else ["- no tournaments found"]

    match_lines = [
        f"- tournament {tournament_id}: {team_a} vs {team_b} | status: {status}"
        for tournament_id, team_a, team_b, status in match_rows
    ] if match_rows else ["- no recent match data"]

    return (
        "Public database snapshot:\n"
        f"- total tournaments: {tournament_count}\n"
        f"- total teams: {team_count}\n"
        f"- total matches: {match_count}\n"
        f"- total users: {user_count}\n"
        f"- total announcements: {announcement_count}\n"
        "- recent tournaments:\n" + "\n".join(tournament_lines) + "\n"
        "- recent matches:\n" + "\n".join(match_lines) + "\n"
        "Important: this snapshot contains only public product data and excludes passwords, security tokens, secrets, and private account records."
    )


async def get_upcoming_tournaments_summary(limit: int = 5) -> str:
    try:
        _ensure_backend_modules()
        from sqlalchemy import select

        from app.core.database import async_session
        from app.models.tournament import Tournament

        async with async_session() as session:
            rows = (
                await session.execute(
                    select(Tournament)
                    .where(Tournament.status.in_(["upcoming", "registration_open"]))
                    .order_by(Tournament.start_date.is_(None), Tournament.start_date.asc(), Tournament.created_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
    except Exception:
        return "I couldn't find any upcoming tournaments right now."

    if not rows:
        return "I couldn't find any upcoming tournaments right now."

    names = ", ".join(f"{item.name} ({item.game})" for item in rows)
    return f"I found {len(rows)} upcoming tournament(s): {names}."


async def get_live_tournaments_summary(limit: int = 5) -> str:
    try:
        _ensure_backend_modules()
        from sqlalchemy import select

        from app.core.database import async_session
        from app.models.tournament import Tournament

        async with async_session() as session:
            rows = (
                await session.execute(
                    select(Tournament)
                    .where(Tournament.status == "live")
                    .order_by(Tournament.start_date.is_(None), Tournament.start_date.asc(), Tournament.created_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
    except Exception:
        return "I couldn't find any live tournaments right now."

    if not rows:
        return "I couldn't find any live tournaments right now."

    names = ", ".join(f"{item.name} ({item.game})" for item in rows)
    return f"Right now, I found {len(rows)} live tournament(s): {names}."


async def get_user_registration_summary(user_id: Optional[int]) -> str:
    if user_id is None:
        return "I can only check your registration count when you are logged in to the site."

    try:
        _ensure_backend_modules()
        from sqlalchemy import func, select

        from app.core.database import async_session
        from app.models.tournament import Tournament
        from app.models.tournament_registration import TournamentRegistration

        async with async_session() as session:
            count = await session.scalar(
                select(func.count(TournamentRegistration.id)).where(TournamentRegistration.user_id == user_id)
            ) or 0

            rows = (
                await session.execute(
                    select(Tournament.name, Tournament.status)
                    .join(TournamentRegistration, TournamentRegistration.tournament_id == Tournament.id)
                    .where(TournamentRegistration.user_id == user_id)
                    .order_by(TournamentRegistration.created_at.desc())
                    .limit(10)
                )
            ).all()
    except Exception:
        return "I couldn't check your tournament registrations right now."

    if count == 0:
        return "You are not registered in any tournaments right now."

    names = ", ".join(f"{name} ({status})" for name, status in rows)
    return f"You are registered in {count} tournament(s): {names}."


def ensure_help_document_loaded(force_reload: bool = False) -> None:
    """Load the website support knowledge base when needed."""
    global DOCUMENT_CONTEXT, CURRENT_DOCUMENT_FILE, DOCUMENT_LAST_MODIFIED, CHAT_HISTORY

    if HELP_KNOWLEDGE_PATH.name != "Help&Support.md":
        raise HTTPException(
            status_code=500,
            detail="Help knowledge file name mismatch. Expected Help&Support.md.",
        )

    if not HELP_KNOWLEDGE_PATH.exists():
        DOCUMENT_CONTEXT = ""
        CURRENT_DOCUMENT_FILE = None
        DOCUMENT_LAST_MODIFIED = None
        CHAT_HISTORY = []
        return

    modified_at = HELP_KNOWLEDGE_PATH.stat().st_mtime
    if (
        not force_reload
        and DOCUMENT_CONTEXT
        and CURRENT_DOCUMENT_FILE == HELP_KNOWLEDGE_PATH.name
        and DOCUMENT_LAST_MODIFIED == modified_at
    ):
        return

    file_size_mb = HELP_KNOWLEDGE_PATH.stat().st_size / (1024 * 1024)
    if file_size_mb > settings.max_image_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Help knowledge file is too large. Max allowed size is {settings.max_image_size_mb} MB.",
        )

    DOCUMENT_CONTEXT = HELP_KNOWLEDGE_PATH.read_text(encoding="utf-8")
    CURRENT_DOCUMENT_FILE = HELP_KNOWLEDGE_PATH.name
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


def clean_markdown_response(text: str) -> str:
    cleaned = text or ""
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    cleaned = re.sub(r"^\s*[-*]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*\d+\.\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"\s+\n", "\n", cleaned)
    return cleaned.strip()


def is_admin_creation_question(question: str) -> bool:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", question.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return False
    create_words = {"create", "make", "new", "add", "start"}
    tournament_words = {"tournament", "tournaments"}
    tokens = set(cleaned.split())
    if tournament_words.intersection(tokens) and create_words.intersection(tokens):
        return True
    return "create a tournament" in cleaned or "make a tournament" in cleaned or "new tournament" in cleaned


def is_upcoming_or_live_question(question: str) -> bool:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", question.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return False
    return (
        "tournament" in cleaned and (
            "upcoming" in cleaned or "live" in cleaned or "happening now" in cleaned or "currently live" in cleaned or "this week" in cleaned
        )
    )


def is_user_registration_count_question(question: str) -> bool:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", question.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return False
    tournament_match = "tournament" in cleaned or "tournaments" in cleaned or "match" in cleaned
    count_match = "how many" in cleaned or "count" in cleaned or "many" in cleaned or "registered in" in cleaned
    done_match = "registered" in cleaned or "register" in cleaned or "joined" in cleaned
    return tournament_match and count_match and done_match


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
            detail="Help knowledge file not found. Expected services/ai-helpchat/Help&Support.md.",
        )

    try:
        question = req.question.strip()
        support_context = DOCUMENT_CONTEXT
        if question:
            database_snapshot = await get_database_support_snapshot()
            if database_snapshot:
                support_context = f"{DOCUMENT_CONTEXT}\n\n{database_snapshot}"

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
                "I can answer questions about registration, tournaments, teams, match results, admin tasks, "
                "and general site guidance. You can ask me about the platform in plain language."
            )
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )
        if is_thanks(question):
            answer = "You’re welcome. Ask me anything about the tournament site whenever you’re ready."
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )
        if is_goodbye(question):
            answer = "Goodbye. If you want to continue later, ask me another question about the site."
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        if is_admin_creation_question(question) and (req.role or "user").lower() != "admin":
            answer = "Only admin users can create tournaments. If you are a regular user, you can join a tournament or create a team instead."
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        if is_upcoming_or_live_question(question):
            upcoming = await get_upcoming_tournaments_summary()
            live = await get_live_tournaments_summary()
            answer = f"{upcoming} {live}"
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        if is_user_registration_count_question(question):
            answer = await get_user_registration_summary(req.user_id)
            answer = clean_markdown_response(answer)
            append_chat_history("user", question)
            append_chat_history("assistant", answer)
            return ChatResponse(
                success=True,
                answer=answer,
                timestamp=utc_now_iso(),
                source_document=CURRENT_DOCUMENT_FILE,
            )

        chunks = chunk_text(support_context)
        if is_summary_request(question):
            relevant_context = build_document_overview(chunks)
            user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
                context=relevant_context,
                history=format_chat_history(),
                question=(
                    f"{question}\n\n"
                    "Give a short, user-friendly overview of the main website support topics."
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

        user_message = DOCUMENT_QA_USER_PROMPT_TEMPLATE.format(
            context=relevant_context,
            history=format_chat_history(),
            question=question,
        )

        # Get answer from Ollama
        answer = await query_ollama(DOCUMENT_QA_SYSTEM_PROMPT, user_message)
        answer = clean_markdown_response(answer)
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

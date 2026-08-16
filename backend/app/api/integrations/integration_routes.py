from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Annotated, Literal, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, text

from app.core.config import settings
from app.core.database import async_session
from app.core.security import create_access_token, require_admin, require_user
from app.models.auth_user import AuthUser
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration

router = APIRouter(prefix="/integrations", tags=["integrations"])
AdminUser = Annotated[AuthUser, Depends(require_admin)]
CurrentUser = Annotated[AuthUser, Depends(require_user)]
_OAUTH_STATE: dict[str, str] = {}

class OAuthConfig(BaseModel):
    provider: Literal["google", "facebook"]
    configured: bool
    authorization_url: Optional[str] = None

class DiscordAnnouncementIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

class StreamConfigOut(BaseModel):
    provider: str
    configured: bool
    channel: Optional[str] = None
    embed_url: Optional[str] = None

class AIRequest(BaseModel):
    tournament_id: int
    instruction: Optional[str] = Field(default=None, max_length=2000)

class ModerationReportIn(BaseModel):
    target_type: Literal["user", "team", "match", "tournament", "message"]
    target_id: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=3, max_length=1000)

class ModerationStatusIn(BaseModel):
    status: Literal["open", "reviewing", "resolved", "dismissed"]
    moderator_note: Optional[str] = Field(default=None, max_length=2000)


def _oauth_provider_config(provider: str):
    if provider == "google":
        return settings.GOOGLE_CLIENT_ID or "", settings.GOOGLE_CLIENT_SECRET or "", "https://accounts.google.com/o/oauth2/v2/auth"
    return settings.FACEBOOK_APP_ID or "", settings.FACEBOOK_APP_SECRET or "", "https://www.facebook.com/v24.0/dialog/oauth"

@router.get("/oauth/{provider}", response_model=OAuthConfig)
async def oauth_config(provider: Literal["google", "facebook"]):
    client_id, _, auth_url = _oauth_provider_config(provider)
    configured = bool(client_id and settings.OAUTH_FRONTEND_CALLBACK_URL and settings.PUBLIC_API_BASE_URL)
    if not configured:
        return OAuthConfig(provider=provider, configured=False)
    state = secrets.token_urlsafe(24)
    _OAUTH_STATE[state] = provider
    redirect_uri = f"{settings.PUBLIC_API_BASE_URL.rstrip('/')}/api/integrations/oauth/{provider}/callback"
    scope = "openid email profile" if provider == "google" else "email,public_profile"
    authorization_url = f"{auth_url}?{urlencode({'client_id': client_id, 'redirect_uri': redirect_uri, 'response_type': 'code', 'scope': scope, 'state': state})}"
    return OAuthConfig(provider=provider, configured=True, authorization_url=authorization_url)

@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: Literal["google", "facebook"], code: str, state: str):
    if _OAUTH_STATE.pop(state, None) != provider:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    client_id, client_secret, _ = _oauth_provider_config(provider)
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="OAuth provider is not configured")
    redirect_uri = f"{settings.PUBLIC_API_BASE_URL.rstrip('/')}/api/integrations/oauth/{provider}/callback"
    async with httpx.AsyncClient(timeout=20) as client:
        if provider == "google":
            token_response = await client.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": client_id, "client_secret": client_secret, "redirect_uri": redirect_uri, "grant_type": "authorization_code"})
            token_response.raise_for_status()
            token = token_response.json().get("access_token")
            profile_response = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {token}"})
        else:
            token_response = await client.get("https://graph.facebook.com/v24.0/oauth/access_token", params={"client_id": client_id, "client_secret": client_secret, "redirect_uri": redirect_uri, "code": code})
            token_response.raise_for_status()
            token = token_response.json().get("access_token")
            profile_response = await client.get("https://graph.facebook.com/me", params={"fields": "id,name,email", "access_token": token})
        if not token:
            raise HTTPException(status_code=502, detail="OAuth provider did not return an access token")
        profile_response.raise_for_status()
        profile = profile_response.json()
    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=422, detail="OAuth account did not provide a usable email")
    async with async_session() as session:
        record = (await session.execute(select(AuthUser).where(AuthUser.email == email.lower()))).scalar_one_or_none()
        if not record:
            record = AuthUser(email=email.lower(), name=profile.get("name") or email.split("@")[0], password=secrets.token_urlsafe(32), role="user")
            session.add(record)
            await session.flush()
        jwt_token, expires_at = create_access_token(record)
        await session.commit()
    return RedirectResponse(f"{settings.OAUTH_FRONTEND_CALLBACK_URL}?{urlencode({'token': jwt_token, 'expires_at': expires_at.isoformat(), 'provider': provider})}")

@router.get("/discord/status")
async def discord_status(_: CurrentUser):
    return {"configured": bool(settings.DISCORD_BOT_TOKEN and settings.DISCORD_CHANNEL_ID)}

@router.post("/discord/announce")
async def discord_announce(payload: DiscordAnnouncementIn, _: AdminUser):
    if not settings.DISCORD_BOT_TOKEN or not settings.DISCORD_CHANNEL_ID:
        raise HTTPException(status_code=503, detail="Discord bot credentials are not configured")
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"https://discord.com/api/v10/channels/{settings.DISCORD_CHANNEL_ID}/messages", headers={"Authorization": f"Bot {settings.DISCORD_BOT_TOKEN}"}, json={"content": payload.content})
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Discord rejected the announcement")
    return {"success": True, "message_id": response.json().get("id")}

@router.get("/stream", response_model=StreamConfigOut)
async def stream_config(_: CurrentUser):
    provider = settings.STREAM_PROVIDER.lower()
    channel = settings.STREAM_CHANNEL or None
    configured = bool(channel and provider in {"twitch", "youtube"})
    if not configured:
        return StreamConfigOut(provider=provider, configured=False)
    embed_url = f"https://player.twitch.tv/?channel={channel}&parent={settings.STREAM_PARENT_DOMAIN}" if provider == "twitch" else f"https://www.youtube.com/embed/{channel}"
    return StreamConfigOut(provider=provider, configured=True, channel=channel, embed_url=embed_url)

async def _context(tournament_id: int):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        registrations = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id))).scalars().all()
        matches = (await session.execute(select(Match).where(Match.tournament_id == tournament_id))).scalars().all()
    return {"name": tournament.name, "game": tournament.game, "format": tournament.format, "status": tournament.status, "teams": [r.team_name for r in registrations], "standings": sorted([{"team": r.team_name, "points": r.points} for r in registrations], key=lambda x: x["points"], reverse=True), "matches": [{"round": m.round_name, "team_a": m.team_a, "team_b": m.team_b, "scores": [m.team_a_score, m.team_b_score], "winner": m.winner, "status": m.status} for m in matches]}

async def _ai(prompt: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=settings.AI_CHATBOT_OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(f"{settings.AI_CHATBOT_OLLAMA_BASE_URL.rstrip('/')}/api/generate", json={"model": settings.AI_CHATBOT_OLLAMA_MODEL, "prompt": prompt, "stream": False})
            response.raise_for_status()
            result = response.json().get("response")
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="AI provider is unavailable") from exc
    if not isinstance(result, str) or not result.strip():
        raise HTTPException(status_code=502, detail="AI provider returned an empty response")
    return result.strip()

@router.post("/ai/insights")
async def tournament_ai_insights(payload: AIRequest, _: CurrentUser):
    data = await _context(payload.tournament_id)
    return {"tournament_id": payload.tournament_id, "insights": await _ai("Analyze this esports tournament data. Return performance trends, matchup insights, risks, and actionable recommendations. Never invent facts.\n" + json.dumps(data))}

@router.post("/ai/recap")
async def tournament_ai_recap(payload: AIRequest, _: CurrentUser):
    data = await _context(payload.tournament_id)
    return {"tournament_id": payload.tournament_id, "recap": await _ai("Write a factual esports tournament recap with headline, summary, key results, standout teams, and next steps. Use only this data.\n" + json.dumps(data))}

@router.post("/ai/social")
async def tournament_ai_social(payload: AIRequest, _: CurrentUser):
    data = await _context(payload.tournament_id)
    return {"tournament_id": payload.tournament_id, "posts": await _ai("Create three short factual social posts: hype, results, and next-event. Use only this tournament data and do not invent claims.\n" + json.dumps(data))}

async def _ensure_reports(session):
    await session.execute(text("CREATE TABLE IF NOT EXISTS moderation_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL, target_type VARCHAR(30) NOT NULL, target_id VARCHAR(100) NOT NULL, reason VARCHAR(1000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'open', moderator_note VARCHAR(2000), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)"))

@router.post("/moderation/reports")
async def create_moderation_report(payload: ModerationReportIn, current_user: CurrentUser):
    async with async_session() as session:
        await _ensure_reports(session)
        result = await session.execute(text("INSERT INTO moderation_reports (reporter_id,target_type,target_id,reason) VALUES (:reporter,:type,:target,:reason) RETURNING id, reporter_id, target_type, target_id, reason, status, moderator_note, created_at, updated_at"), {"reporter": current_user.id, "type": payload.target_type, "target": payload.target_id, "reason": payload.reason})
        row = result.mappings().one(); await session.commit()
    return dict(row)

@router.get("/moderation/reports")
async def list_moderation_reports(_: AdminUser):
    async with async_session() as session:
        await _ensure_reports(session)
        rows = (await session.execute(text("SELECT * FROM moderation_reports ORDER BY created_at DESC"))).mappings().all()
    return [dict(row) for row in rows]

@router.patch("/moderation/reports/{report_id}")
async def update_moderation_report(report_id: int, payload: ModerationStatusIn, _: AdminUser):
    async with async_session() as session:
        await _ensure_reports(session)
        result = await session.execute(text("UPDATE moderation_reports SET status=:status, moderator_note=:note, updated_at=CURRENT_TIMESTAMP WHERE id=:id"), {"status": payload.status, "note": payload.moderator_note, "id": report_id})
        if result.rowcount == 0: raise HTTPException(status_code=404, detail="Moderation report not found")
        row = (await session.execute(text("SELECT * FROM moderation_reports WHERE id=:id"), {"id": report_id})).mappings().one(); await session.commit()
    return dict(row)

@router.get("/health")
async def integration_health(_: CurrentUser):
    return {"oauth_google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET), "oauth_facebook": bool(settings.FACEBOOK_APP_ID and settings.FACEBOOK_APP_SECRET), "discord": bool(settings.DISCORD_BOT_TOKEN and settings.DISCORD_CHANNEL_ID), "stream": bool(settings.STREAM_PROVIDER and settings.STREAM_CHANNEL), "ai": bool(settings.AI_CHATBOT_OLLAMA_BASE_URL and settings.AI_CHATBOT_OLLAMA_MODEL), "checked_at": datetime.now(timezone.utc).isoformat()}

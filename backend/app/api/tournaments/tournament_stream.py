import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.database import async_session
from app.models.match import Match
from app.models.tournament import Tournament

router = APIRouter(prefix="/tournaments", tags=["live"])


async def _events(tournament_id: int) -> AsyncIterator[str]:
    previous = None
    for _ in range(60):
        async with async_session() as session:
            tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
            if not tournament:
                return
            matches = (await session.execute(select(Match).where(Match.tournament_id == tournament_id).order_by(Match.id.asc()))).scalars().all()
            payload = {
                "tournament_id": tournament_id,
                "status": tournament.status,
                "matches": [
                    {"id": m.id, "round_name": m.round_name, "team_a": m.team_a, "team_b": m.team_b, "team_a_score": m.team_a_score, "team_b_score": m.team_b_score, "winner": m.winner, "status": m.status}
                    for m in matches
                ],
            }
        serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        if serialized != previous:
            yield f"event: tournament_update\ndata: {serialized}\n\n"
            previous = serialized
        await asyncio.sleep(2)


@router.get("/{tournament_id}/stream")
async def tournament_stream(tournament_id: int):
    async with async_session() as session:
        exists = (await session.execute(select(Tournament.id).where(Tournament.id == tournament_id))).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return StreamingResponse(_events(tournament_id), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_admin
from app.models.auth_user import AuthUser
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration
from app.services.brackets import generate_bracket

router = APIRouter(prefix="/tournaments", tags=["format progression"])
AdminUser = Annotated[AuthUser, Depends(require_admin)]

class SwissRoundIn(BaseModel):
    round_number: int = Field(ge=2, le=100)


def _pair_swiss(standings: list[tuple[str, int]], previous_pairs: set[frozenset[str]]):
    ordered = sorted(standings, key=lambda item: (-item[1], item[0].casefold()))
    pairs: list[tuple[str, str]] = []
    used: set[str] = set()
    for index, (team, _) in enumerate(ordered):
        if team in used:
            continue
        opponent = None
        for candidate, _ in ordered[index + 1 :]:
            if candidate not in used and frozenset((team, candidate)) not in previous_pairs:
                opponent = candidate
                break
        if opponent:
            pairs.append((team, opponent)); used.update({team, opponent})
    return pairs

@router.post("/{tournament_id}/formats/publish", response_model=list[dict])
async def publish_supported_format(tournament_id: int, _: AdminUser):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        registrations = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.status == "checked_in").order_by(TournamentRegistration.created_at.asc()))).scalars().all()
        if len(registrations) < 2:
            raise HTTPException(status_code=400, detail="At least two checked-in participants are required")
        if tournament.format.strip().lower() not in {"double elimination", "swiss"}:
            raise HTTPException(status_code=400, detail="Use the existing single-elimination publisher for Single Elimination")
        existing = (await session.execute(select(Match).where(Match.tournament_id == tournament_id))).scalars().all()
        if existing:
            return [{"match_id": m.id, "round_name": m.round_name, "bracket": "main" if not m.round_name.startswith("Losers") else "losers"} for m in existing]
        slots = generate_bracket(tournament.format, [r.team_name for r in registrations])
        created = []
        for slot in slots:
            team_a = slot.team_a or "TBD"
            team_b = slot.team_b or "TBD"
            status = "scheduled"
            winner = None
            if (slot.team_a is None) ^ (slot.team_b is None):
                status = "finished"; winner = slot.team_a or slot.team_b
                if slot.team_a is None: team_a = "BYE"
                else: team_b = "BYE"
            match = Match(tournament_id=tournament_id, round_name=slot.round_name, team_a=team_a, team_b=team_b, status=status, winner=winner, bracket_match_number=slot.match_number)
            session.add(match); created.append(match)
        await session.flush()
        await session.commit()
    return [{"match_id": m.id, "round_name": m.round_name, "bracket": "losers" if m.round_name.startswith("Losers") else ("grand_final" if m.round_name == "Grand Final" else "main")} for m in created]

@router.post("/{tournament_id}/swiss/round")
async def create_swiss_round(tournament_id: int, payload: SwissRoundIn, _: AdminUser):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament or tournament.format.strip().lower() != "swiss":
            raise HTTPException(status_code=400, detail="Tournament is not configured as Swiss")
        registrations = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id))).scalars().all()
        matches = (await session.execute(select(Match).where(Match.tournament_id == tournament_id))).scalars().all()
        if any(m.round_name == f"Swiss Round {payload.round_number}" for m in matches):
            raise HTTPException(status_code=409, detail="Swiss round already exists")
        previous_pairs = {frozenset((m.team_a, m.team_b)) for m in matches if m.team_a != "BYE" and m.team_b != "BYE"}
        pairs = _pair_swiss([(r.team_name, r.points) for r in registrations], previous_pairs)
        if not pairs:
            raise HTTPException(status_code=400, detail="No valid new Swiss pairings are available")
        start_number = len(matches) + 1
        for offset, (team_a, team_b) in enumerate(pairs):
            session.add(Match(tournament_id=tournament_id, round_name=f"Swiss Round {payload.round_number}", team_a=team_a, team_b=team_b, status="scheduled", bracket_match_number=start_number + offset))
        await session.commit()
    return {"success": True, "round": payload.round_number, "matches_created": len(pairs), "pairings": [{"team_a": a, "team_b": b} for a, b in pairs]}

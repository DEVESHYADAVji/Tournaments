from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_admin
from app.models.auth_user import AuthUser
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration
from app.services.brackets import generate_single_elimination

router = APIRouter(prefix="/tournaments", tags=["bracket progression"])
AdminUser = Annotated[AuthUser, Depends(require_admin)]


@router.post("/{tournament_id}/bracket/publish", response_model=list[dict])
async def publish_single_elimination_bracket(tournament_id: int, _: AdminUser):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if tournament.format.strip().lower() != "single elimination":
            raise HTTPException(status_code=400, detail="Persistent bracket progression is currently supported for Single Elimination tournaments")
        existing = (await session.execute(select(Match).where(Match.tournament_id == tournament_id, Match.bracket_match_number.is_not(None)))).scalars().all()
        if existing:
            return [{"match_id": match.id, "match_number": match.bracket_match_number, "next_match_id": match.next_match_id} for match in existing]

        registrations = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.status == "checked_in").order_by(TournamentRegistration.created_at.asc()))).scalars().all()
        if len(registrations) < 2:
            raise HTTPException(status_code=400, detail="At least two checked-in participants are required")

        slots = generate_single_elimination([registration.team_name for registration in registrations])
        matches: list[Match] = []
        for slot in slots:
            team_a = slot.team_a or "TBD"
            team_b = slot.team_b or "TBD"
            status = "scheduled"
            winner = None
            if (slot.team_a is None) ^ (slot.team_b is None):
                status = "finished"
                winner = slot.team_a or slot.team_b
                if slot.team_a is None:
                    team_a = "BYE"
                else:
                    team_b = "BYE"
            match = Match(tournament_id=tournament_id, round_name=slot.round_name, team_a=team_a, team_b=team_b, winner=winner, status=status, bracket_match_number=slot.match_number)
            session.add(match)
            matches.append(match)
        await session.flush()

        round_groups: dict[str, list[Match]] = {}
        for match in matches:
            round_groups.setdefault(match.round_name, []).append(match)
        ordered_rounds = list(round_groups.values())
        for round_index in range(len(ordered_rounds) - 1):
            current_round = ordered_rounds[round_index]
            next_round = ordered_rounds[round_index + 1]
            for index, match in enumerate(current_round):
                match.next_match_id = next_round[index // 2].id

        for match in matches:
            if match.status == "finished" and match.next_match_id:
                next_match = next(item for item in matches if item.id == match.next_match_id)
                if next_match.team_a == "TBD":
                    next_match.team_a = match.winner or "TBD"
                elif next_match.team_b == "TBD":
                    next_match.team_b = match.winner or "TBD"

        await session.commit()
    return [{"match_id": match.id, "match_number": match.bracket_match_number, "next_match_id": match.next_match_id} for match in matches]


@router.post("/{tournament_id}/matches/{match_id}/advance", response_model=dict)
async def advance_match_winner(tournament_id: int, match_id: int, _: AdminUser):
    async with async_session() as session:
        match = (await session.execute(select(Match).where(Match.id == match_id, Match.tournament_id == tournament_id))).scalar_one_or_none()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match.status != "finished" or not match.winner:
            raise HTTPException(status_code=400, detail="Finish the match before advancing its winner")
        if not match.next_match_id:
            return {"success": True, "completed": True, "message": "Winner is the tournament champion"}
        next_match = (await session.execute(select(Match).where(Match.id == match.next_match_id, Match.tournament_id == tournament_id))).scalar_one()
        if next_match.team_a == match.winner or next_match.team_b == match.winner:
            return {"success": True, "next_match_id": next_match.id, "already_advanced": True}
        if next_match.team_a == "TBD":
            next_match.team_a = match.winner
        elif next_match.team_b == "TBD":
            next_match.team_b = match.winner
        else:
            raise HTTPException(status_code=409, detail="Next match already has two participants")
        await session.commit()
    return {"success": True, "next_match_id": next_match.id, "team": match.winner}

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_admin, require_user
from app.models.auth_user import AuthUser
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration
from app.services.brackets import MatchSlot, generate_bracket

router = APIRouter(prefix="/tournaments", tags=["tournament operations"])
PlayerUser = Annotated[AuthUser, Depends(require_user)]
AdminUser = Annotated[AuthUser, Depends(require_admin)]


class CheckInOut(BaseModel):
    registration_id: int
    tournament_id: int
    team_name: str
    status: str
    checked_in_at: datetime


class BracketSlotOut(BaseModel):
    round_name: str
    match_number: int
    team_a: str | None
    team_b: str | None
    bracket: str
    bye: bool = False


async def _get_tournament(tournament_id: int) -> Tournament:
    async with async_session() as session:
        tournament = (
            await session.execute(select(Tournament).where(Tournament.id == tournament_id))
        ).scalar_one_or_none()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.post("/{tournament_id}/check-in", response_model=CheckInOut)
async def check_in(tournament_id: int, current_user: PlayerUser):
    tournament = await _get_tournament(tournament_id)
    now = datetime.utcnow()
    if tournament.end_date and now > tournament.end_date:
        raise HTTPException(status_code=400, detail="Tournament has ended")
    if tournament.start_date and now < tournament.start_date - timedelta(hours=24):
        raise HTTPException(status_code=400, detail="Check-in opens 24 hours before the tournament")

    async with async_session() as session:
        registration = (
            await session.execute(
                select(TournamentRegistration).where(
                    TournamentRegistration.tournament_id == tournament_id,
                    TournamentRegistration.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()
        if not registration:
            raise HTTPException(status_code=404, detail="You are not registered for this tournament")
        registration.status = "checked_in"
        await session.commit()
        await session.refresh(registration)

    return CheckInOut(
        registration_id=registration.id,
        tournament_id=tournament_id,
        team_name=registration.team_name,
        status=registration.status,
        checked_in_at=now,
    )


@router.get("/{tournament_id}/bracket", response_model=list[BracketSlotOut])
async def get_bracket(tournament_id: int, _: AdminUser):
    tournament = await _get_tournament(tournament_id)
    async with async_session() as session:
        registrations = (
            await session.execute(
                select(TournamentRegistration)
                .where(
                    TournamentRegistration.tournament_id == tournament_id,
                    TournamentRegistration.status == "checked_in",
                )
                .order_by(TournamentRegistration.created_at.asc())
            )
        ).scalars().all()

    if len(registrations) < 2:
        raise HTTPException(status_code=400, detail="At least two checked-in participants are required")

    try:
        slots: list[MatchSlot] = generate_bracket(
            tournament.format,
            [registration.team_name for registration in registrations],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return [
        BracketSlotOut(
            round_name=slot.round_name,
            match_number=slot.match_number,
            team_a=slot.team_a,
            team_b=slot.team_b,
            bracket=slot.bracket,
            bye=bool((slot.team_a is None) ^ (slot.team_b is None)),
        )
        for slot in slots
    ]

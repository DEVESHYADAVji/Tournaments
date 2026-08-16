from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.core.database import async_session
from app.core.security import require_user
from app.models.auth_user import AuthUser
from app.models.team import Team, TeamMember
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration

router = APIRouter(prefix="/tournaments", tags=["team registration"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]


@router.post("/{tournament_id}/join-team/{team_id}", response_model=dict)
async def join_with_team(tournament_id: int, team_id: int, current_user: CurrentUser):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if tournament.status != "registration_open":
            raise HTTPException(status_code=400, detail="Tournament registration is not open")
        team = (await session.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        membership = (await session.execute(select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id))).scalar_one_or_none()
        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this team")
        existing = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.team_name == team.name))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="This team is already registered")
        count = await session.scalar(select(func.count(TournamentRegistration.id)).where(TournamentRegistration.tournament_id == tournament_id)) or 0
        if count >= tournament.max_teams:
            raise HTTPException(status_code=400, detail="Tournament slots are full")
        registration = TournamentRegistration(tournament_id=tournament_id, user_id=team.owner_user_id, team_name=team.name, status="registered", points=0)
        session.add(registration)
        await session.commit()
        await session.refresh(registration)
    return {"success": True, "message": "Team registered successfully", "registration_id": registration.id}


@router.post("/{tournament_id}/check-in", response_model=dict)
async def check_in(tournament_id: int, current_user: CurrentUser):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        registration = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.user_id == current_user.id))).scalar_one_or_none()
        if not registration:
            raise HTTPException(status_code=403, detail="You must register for this tournament before checking in")
        if registration.status == "checked_in":
            return {"success": True, "message": "You are already checked in", "status": "checked_in"}
        if registration.status not in {"registered", "approved"}:
            raise HTTPException(status_code=400, detail="This registration cannot be checked in")
        if tournament.status == "completed":
            raise HTTPException(status_code=400, detail="This tournament has already completed")
        registration.status = "checked_in"
        await session.commit()
    return {"success": True, "message": "Check-in successful. You are ready for the tournament.", "status": "checked_in"}

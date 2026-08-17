from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_user
from app.models.auth_user import AuthUser
from app.models.team import Team, TeamInvitation, TeamMember

router = APIRouter(prefix="/teams", tags=["teams"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]


class TeamCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    game: str = Field(min_length=2, max_length=100)


class TeamOut(BaseModel):
    id: int
    name: str
    game: str
    owner_user_id: int

    model_config = {"from_attributes": True}


class InviteIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class InvitationOut(BaseModel):
    id: int
    team_id: int
    email: str
    status: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[TeamOut])
async def list_my_teams(current_user: CurrentUser):
    async with async_session() as session:
        rows = (
            await session.execute(
                select(Team)
                .join(TeamMember, TeamMember.team_id == Team.id)
                .where(TeamMember.user_id == current_user.id)
                .order_by(Team.created_at.desc())
            )
        ).scalars().all()
    return rows


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(payload: TeamCreateIn, current_user: CurrentUser):
    name = payload.name.strip()
    game = payload.game.strip()
    async with async_session() as session:
        existing = (
            await session.execute(select(Team).where(Team.name == name))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Team name is already in use")

        team = Team(name=name, game=game, owner_user_id=current_user.id)
        session.add(team)
        await session.flush()
        session.add(TeamMember(team_id=team.id, user_id=current_user.id, role="owner"))
        await session.commit()
        await session.refresh(team)
    return team


@router.post("/{team_id}/invitations", response_model=InvitationOut, status_code=201)
async def invite_to_team(team_id: int, payload: InviteIn, current_user: CurrentUser):
    email = payload.email.strip().lower()
    async with async_session() as session:
        team = (
            await session.execute(
                select(Team).where(Team.id == team_id, Team.owner_user_id == current_user.id)
            )
        ).scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found or not owned by you")

        invited_user = (
            await session.execute(select(AuthUser).where(AuthUser.email == email))
        ).scalar_one_or_none()
        if invited_user:
            member = (
                await session.execute(
                    select(TeamMember).where(
                        TeamMember.team_id == team_id,
                        TeamMember.user_id == invited_user.id,
                    )
                )
            ).scalar_one_or_none()
            if member:
                raise HTTPException(status_code=409, detail="User is already a team member")

        invitation = TeamInvitation(
            team_id=team_id,
            email=email,
            invited_by_user_id=current_user.id,
            status="pending",
        )
        session.add(invitation)
        await session.commit()
        await session.refresh(invitation)
    return invitation


@router.get("/invitations", response_model=list[InvitationOut])
async def list_invitations(current_user: CurrentUser):
    async with async_session() as session:
        rows = (
            await session.execute(
                select(TeamInvitation)
                .where(TeamInvitation.email == current_user.email, TeamInvitation.status == "pending")
                .order_by(TeamInvitation.created_at.desc())
            )
        ).scalars().all()
    return rows


@router.post("/invitations/{invitation_id}/accept", response_model=TeamOut)
async def accept_invitation(invitation_id: int, current_user: CurrentUser):
    async with async_session() as session:
        invitation = (
            await session.execute(
                select(TeamInvitation).where(
                    TeamInvitation.id == invitation_id,
                    TeamInvitation.email == current_user.email,
                    TeamInvitation.status == "pending",
                )
            )
        ).scalar_one_or_none()
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found or already handled")

        member = (
            await session.execute(
                select(TeamMember).where(
                    TeamMember.team_id == invitation.team_id,
                    TeamMember.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()
        if not member:
            session.add(TeamMember(team_id=invitation.team_id, user_id=current_user.id, role="member"))
        invitation.status = "accepted"
        team = (
            await session.execute(select(Team).where(Team.id == invitation.team_id))
        ).scalar_one()
        await session.commit()
    return team

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_admin, require_user
from app.models.auth_user import AuthUser
from app.models.notification import Notification
from app.models.tournament_registration import TournamentRegistration

router = APIRouter(prefix="/notifications", tags=["notifications"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]
AdminUser = Annotated[AuthUser, Depends(require_admin)]


class NotificationOut(BaseModel):
    id: int
    title: str
    content: str
    read: bool
    created_at: str


class BroadcastIn(BaseModel):
    tournament_id: int
    title: str = Field(min_length=2, max_length=255)
    content: str = Field(min_length=2)


@router.get("", response_model=list[NotificationOut])
async def list_notifications(current_user: CurrentUser):
    async with async_session() as session:
        rows = (
            await session.execute(
                select(Notification)
                .where(Notification.user_id == current_user.id)
                .order_by(Notification.created_at.desc())
            )
        ).scalars().all()
    return [
        NotificationOut(
            id=row.id,
            title=row.title,
            content=row.content,
            read=bool(row.read),
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]


@router.post("/{notification_id}/read", response_model=dict)
async def mark_read(notification_id: int, current_user: CurrentUser):
    async with async_session() as session:
        row = (
            await session.execute(
                select(Notification).where(
                    Notification.id == notification_id,
                    Notification.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")
        row.read = 1
        await session.commit()
    return {"success": True}


@router.post("/broadcast", response_model=dict)
async def broadcast_notification(payload: BroadcastIn, _: AdminUser):
    async with async_session() as session:
        user_ids = (
            await session.execute(
                select(TournamentRegistration.user_id)
                .where(TournamentRegistration.tournament_id == payload.tournament_id)
                .distinct()
            )
        ).scalars().all()
        if not user_ids:
            raise HTTPException(status_code=400, detail="Tournament has no registered participants")
        session.add_all([
            Notification(user_id=user_id, title=payload.title, content=payload.content)
            for user_id in user_ids
        ])
        await session.commit()
    return {"success": True, "recipient_count": len(user_ids)}

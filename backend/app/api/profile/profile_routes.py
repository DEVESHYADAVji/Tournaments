from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.database import async_session
from app.core.security import require_user
from app.models.auth_user import AuthUser

router = APIRouter(prefix="/profile", tags=["profile"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]


class ProfileOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    profile_icon: Optional[int] = None


class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    profile_icon: int = Field(default=1, ge=1, le=10)


@router.get("", response_model=ProfileOut)
async def get_profile(current_user: CurrentUser):
    return ProfileOut.model_validate(current_user, from_attributes=True)


@router.patch("", response_model=ProfileOut)
async def update_profile(payload: ProfileUpdateIn, current_user: CurrentUser):
    async with async_session() as session:
        user = (await session.execute(select(AuthUser).where(AuthUser.id == current_user.id))).scalar_one()
        user.name = payload.name.strip()
        user.profile_icon = payload.profile_icon
        await session.commit()
        await session.refresh(user)
    return ProfileOut.model_validate(user, from_attributes=True)

from datetime import datetime
from hmac import compare_digest
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import async_session
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_user import AuthUser

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    role: Optional[Literal["admin", "user"]] = None


class UserInfo(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: Literal["admin", "user"]


class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    expires_at: Optional[datetime] = None
    user: Optional[UserInfo] = None


class LogoutResponse(BaseModel):
    success: bool
    message: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: Optional[str] = Field(default=None, max_length=255)


class RegisterResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserInfo] = None


def _to_user_info(record: AuthUser) -> UserInfo:
    return UserInfo(id=str(record.id), email=record.email, name=record.name, role=record.role)  # type: ignore[arg-type]


def _build_login_response(record: AuthUser) -> LoginResponse:
    token, expires_at = create_access_token(record)
    return LoginResponse(success=True, token=token, expires_at=expires_at, user=_to_user_info(record))


async def _get_user_by_email(email: str) -> Optional[AuthUser]:
    async with async_session() as session:
        result = await session.execute(select(AuthUser).where(AuthUser.email == email))
        return result.scalar_one_or_none()


async def seed_default_auth_users() -> None:
    """Optionally seed development accounts when credentials are explicitly configured."""
    configured_users = []
    if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
        configured_users.append((settings.SEED_ADMIN_EMAIL, "Admin", settings.SEED_ADMIN_PASSWORD, "admin"))
    if settings.SEED_USER_EMAIL and settings.SEED_USER_PASSWORD:
        configured_users.append((settings.SEED_USER_EMAIL, "Player One", settings.SEED_USER_PASSWORD, "user"))
    if not configured_users:
        return

    async with async_session() as session:
        for email, name, password, role in configured_users:
            email = email.lower()
            result = await session.execute(select(AuthUser).where(AuthUser.email == email))
            if result.scalar_one_or_none():
                continue
            session.add(AuthUser(email=email, name=name, password=hash_password(password), role=role))
        await session.commit()


async def _authenticate(email: str, password: str, required_role: Optional[str] = None) -> AuthUser:
    record = await _get_user_by_email(email.lower())
    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    is_legacy_password = not record.password.startswith("$argon2")
    if is_legacy_password:
        password_valid = compare_digest(record.password, password)
        if password_valid:
            migrated_hash = hash_password(password)
            async with async_session() as session:
                migrated = await session.get(AuthUser, record.id)
                if migrated:
                    migrated.password = migrated_hash
                    await session.commit()
    else:
        password_valid = verify_password(password, record.password)

    if not password_valid or (required_role and record.role != required_role):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return record


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    return _build_login_response(await _authenticate(str(payload.email), payload.password, payload.role))


@router.post("/login/admin", response_model=LoginResponse)
async def login_admin(payload: LoginRequest):
    return _build_login_response(await _authenticate(str(payload.email), payload.password, "admin"))


@router.post("/login/user", response_model=LoginResponse)
async def login_user(payload: LoginRequest):
    return _build_login_response(await _authenticate(str(payload.email), payload.password, "user"))


@router.post("/register", response_model=RegisterResponse)
async def register(payload: RegisterRequest):
    email = str(payload.email).lower()
    if await _get_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    async with async_session() as session:
        record = AuthUser(email=email, name=payload.name or "New User", password=hash_password(payload.password), role="user")
        session.add(record)
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            ) from exc
        await session.refresh(record)
    return RegisterResponse(success=True, message="Registration successful", user=_to_user_info(record))


@router.post("/logout", response_model=LogoutResponse)
async def logout():
    return LogoutResponse(success=True, message="Logged out")

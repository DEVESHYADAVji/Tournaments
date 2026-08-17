from datetime import datetime, timedelta
from hmac import compare_digest
import hashlib
import os
import secrets
import smtplib
from email.message import EmailMessage
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import async_session
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_user import AuthUser
from app.models.password_reset_token import PasswordResetToken

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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str
    development_reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    password: str = Field(min_length=8)


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str


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


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _send_reset_email(recipient: str, name: str, reset_url: str) -> None:
    host = os.getenv("SMTP_HOST")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM_EMAIL") or username
    if not host or not sender:
        return
    message = EmailMessage()
    message["Subject"] = "Reset your Tournaments password"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(f"Hi {name or 'there'},\n\nUse this secure link to reset your Tournaments password. It expires in 30 minutes:\n\n{reset_url}\n\nIf you did not request this, ignore this email.")
    port = int(os.getenv("SMTP_PORT", "587"))
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)


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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered") from exc
        await session.refresh(record)
    return RegisterResponse(success=True, message="Registration successful. You can now sign in as a player.", user=_to_user_info(record))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    record = await _get_user_by_email(str(payload.email).lower())
    generic_message = "If an account exists for that email, password-reset instructions have been sent."
    if not record:
        return ForgotPasswordResponse(success=True, message=generic_message)
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(minutes=int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30")))
    async with async_session() as session:
        await session.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == record.id))
        session.add(PasswordResetToken(user_id=record.id, token_hash=_hash_reset_token(raw_token), expires_at=expires_at))
        await session.commit()
    frontend_url = os.getenv("PASSWORD_RESET_FRONTEND_URL", "http://localhost:5173/reset-password")
    reset_url = f"{frontend_url}?token={raw_token}"
    background_tasks.add_task(_send_reset_email, record.email, record.name, reset_url)
    development_url = reset_url if settings.DEBUG and not os.getenv("SMTP_HOST") else None
    return ForgotPasswordResponse(success=True, message=generic_message, development_reset_url=development_url)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(payload: ResetPasswordRequest):
    now = datetime.utcnow()
    async with async_session() as session:
        reset_token = (await session.execute(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_reset_token(payload.token)))).scalar_one_or_none()
        if not reset_token or reset_token.used_at is not None or reset_token.expires_at <= now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This password reset link is invalid or expired")
        user = await session.get(AuthUser, reset_token.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This password reset link is invalid or expired")
        user.password = hash_password(payload.password)
        reset_token.used_at = now
        await session.commit()
    return ResetPasswordResponse(success=True, message="Password reset successful. You can now sign in with your new password.")


@router.post("/logout", response_model=LogoutResponse)
async def logout():
    return LogoutResponse(success=True, message="Logged out successfully")

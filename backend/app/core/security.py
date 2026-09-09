from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import async_session
from app.models.auth_user import AuthUser
from app.models.token_revocation import TokenRevocation

_password_hash = PasswordHash.recommended()
security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return _password_hash.verify(password, password_hash_value)


def create_access_token(user: Any) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": getattr(user, "email", None),
        "role": getattr(user, "role", "user"),
        "type": "access",
        "jti": uuid4().hex,
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


async def revoke_access_token(token: str) -> None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        if payload.get("type") != "access" or not isinstance(jti, str) or not isinstance(exp, (int, float)):
            raise ValueError("Invalid access token")
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None)
    async with async_session() as session:
        await session.execute(delete(TokenRevocation).where(TokenRevocation.expires_at <= datetime.utcnow()))
        existing = await session.execute(select(TokenRevocation.id).where(TokenRevocation.jti == jti))
        if existing.scalar_one_or_none() is None:
            session.add(TokenRevocation(jti=jti, expires_at=expires_at))
        await session.commit()


async def _get_user_by_id(user_id: int) -> AuthUser | None:
    async with async_session() as session:
        result = await session.execute(select(AuthUser).where(AuthUser.id == user_id))
        return result.scalar_one_or_none()


async def _is_token_revoked(jti: str) -> bool:
    async with async_session() as session:
        await session.execute(delete(TokenRevocation).where(TokenRevocation.expires_at <= datetime.utcnow()))
        result = await session.execute(select(TokenRevocation.id).where(TokenRevocation.jti == jti))
        return result.scalar_one_or_none() is not None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> AuthUser:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access" or not isinstance(payload.get("jti"), str):
            raise ValueError("Invalid token type")
        user_id = int(payload["sub"])
        jti = payload["jti"]
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if await _is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await _get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> AuthUser | None:
    if credentials is None or not credentials.credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def require_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_user(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if current_user.role not in {"user", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required",
        )
    return current_user

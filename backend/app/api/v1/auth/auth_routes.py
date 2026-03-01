from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.core.database import async_session
from app.models.auth_user import AuthUser

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
	email: EmailStr
	password: str
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
	password: str
	name: Optional[str] = None


class RegisterResponse(BaseModel):
	success: bool
	message: str
	user: Optional[UserInfo] = None


_DEFAULT_USERS = [
	{
		"email": "admin@example.com",
		"name": "Admin",
		"password": "password",
		"role": "admin",
	},
	{
		"email": "user@example.com",
		"name": "Player One",
		"password": "password",
		"role": "user",
	},
]


def _to_user_info(record: AuthUser) -> UserInfo:
	return UserInfo(
		id=str(record.id),
		email=record.email,
		name=record.name,
		role=record.role,  # type: ignore[arg-type]
	)


def _build_login_response(record: AuthUser) -> LoginResponse:
	expires = datetime.utcnow() + timedelta(hours=8)
	return LoginResponse(
		success=True,
		token=f"fake-jwt-token-{record.role}-{record.id}",
		expires_at=expires,
		user=_to_user_info(record),
	)


async def _get_user_by_email(email: str) -> Optional[AuthUser]:
	async with async_session() as session:
		result = await session.execute(select(AuthUser).where(AuthUser.email == email))
		return result.scalar_one_or_none()


async def seed_default_auth_users() -> None:
	"""Ensure default admin/user accounts exist for development."""
	async with async_session() as session:
		for user in _DEFAULT_USERS:
			result = await session.execute(select(AuthUser).where(AuthUser.email == user["email"]))
			existing = result.scalar_one_or_none()
			if existing:
				continue
			session.add(
				AuthUser(
					email=user["email"],
					name=user["name"],
					password=user["password"],
					role=user["role"],
				)
			)
		await session.commit()


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
	"""Generic login endpoint. Accepts either admin or user credentials."""
	email = str(payload.email).lower()
	record = await _get_user_by_email(email)
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found. Please register.")
	if record.password != payload.password:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
	if payload.role and record.role != payload.role:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
	return _build_login_response(record)


@router.post("/login/admin", response_model=LoginResponse)
async def login_admin(payload: LoginRequest):
	"""Admin-only login endpoint."""
	email = str(payload.email).lower()
	record = await _get_user_by_email(email)
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found. Please register.")
	if record.password != payload.password:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
	if record.role != "admin":
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
	return _build_login_response(record)


@router.post("/login/user", response_model=LoginResponse)
async def login_user(payload: LoginRequest):
	"""User-only login endpoint."""
	email = str(payload.email).lower()
	record = await _get_user_by_email(email)
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found. Please register.")
	if record.password != payload.password:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
	if record.role != "user":
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
	return _build_login_response(record)


@router.post("/register", response_model=RegisterResponse)
async def register(payload: RegisterRequest):
	"""Register a new user account (user role only)."""
	email = str(payload.email).lower()
	existing = await _get_user_by_email(email)
	if existing:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

	if len(payload.password) < 6:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Password must be at least 6 characters",
		)

	async with async_session() as session:
		record = AuthUser(
			email=email,
			name=payload.name or "New User",
			password=payload.password,
			role="user",
		)
		session.add(record)
		await session.commit()
		await session.refresh(record)

	return RegisterResponse(
		success=True,
		message="Registration successful",
		user=_to_user_info(record),
	)


@router.post("/logout", response_model=LogoutResponse)
async def logout():
	"""Mock logout endpoint. Invalidate token on client/server as needed."""
	return LogoutResponse(success=True, message="Logged out")

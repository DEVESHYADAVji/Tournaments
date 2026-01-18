from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
	email: EmailStr
	password: str


class UserInfo(BaseModel):
	id: str
	email: EmailStr
	name: Optional[str] = None


class LoginResponse(BaseModel):
	success: bool
	token: Optional[str] = None
	expires_at: Optional[datetime] = None
	user: Optional[UserInfo] = None


class LogoutResponse(BaseModel):
	success: bool
	message: Optional[str] = None


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
	"""Mock login endpoint. Replace with real authentication logic."""
	# Mock validation
	if payload.email == "admin@example.com" and payload.password == "password":
		expires = datetime.utcnow() + timedelta(hours=8)
		return LoginResponse(
			success=True,
			token="fake-jwt-token",
			expires_at=expires,
			user=UserInfo(id="1", email=payload.email, name="Admin"),
		)

	raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.post("/logout", response_model=LogoutResponse)
async def logout():
	"""Mock logout endpoint. Invalidate token on client/server as needed."""
	return LogoutResponse(success=True, message="Logged out")

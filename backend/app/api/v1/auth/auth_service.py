from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel, EmailStr


class AuthResult(BaseModel):
	success: bool
	token: Optional[str] = None
	expires_at: Optional[datetime] = None
	user: Optional[dict] = None


def validate_credentials(email: str, password: str) -> bool:
	"""Placeholder credential validation.

	Replace this with real password hashing and DB lookup.
	"""
	# For now, accept a single hard-coded user for development
	return email == "admin@example.com" and password == "password"


def create_token_for_user(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
	"""Create a fake token string. Replace with JWT creation in production."""
	if expires_delta is None:
		expires_delta = timedelta(hours=8)
	expires = datetime.utcnow() + expires_delta
	# Simple placeholder token
	token = f"fake-token-{user_id}-{int(expires.timestamp())}"
	return token


def login_service(email: EmailStr, password: str) -> AuthResult:
	"""Authenticate user and return token + user info (placeholder)."""
	if not validate_credentials(email, password):
		return AuthResult(success=False)

	# Mock user data
	user = {"id": "1", "email": email, "name": "Admin"}
	token = create_token_for_user(user_id=user["id"]) 
	expires_at = datetime.utcnow() + timedelta(hours=8)

	return AuthResult(success=True, token=token, expires_at=expires_at, user=user)


def logout_service(token: Optional[str] = None) -> dict:
	"""Placeholder logout logic. Invalidate token server-side if necessary."""
	# There's no token store in this placeholder implementation.
	return {"success": True, "message": "Logged out"}


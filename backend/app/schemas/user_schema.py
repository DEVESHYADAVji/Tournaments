from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
	email: EmailStr
	role: Optional[str] = "user"


class UserCreate(UserBase):
	# Plain-text password for creation (hash before storing)
	password: str


class UserResponse(UserBase):
	id: int
	created_at: datetime

	class Config:
		orm_mode = True


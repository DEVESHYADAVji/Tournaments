from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TournamentBase(BaseModel):
	name: str
	game: str
	status: Optional[str] = "scheduled"
	date: Optional[str] = None
	location: Optional[str] = None
	description: Optional[str] = None


class TournamentCreate(TournamentBase):
	pass


class TournamentUpdate(BaseModel):
	name: Optional[str] = None
	game: Optional[str] = None
	status: Optional[str] = None
	date: Optional[str] = None
	location: Optional[str] = None
	description: Optional[str] = None


class TournamentResponse(TournamentBase):
	id: int
	created_at: datetime

	class Config:
		orm_mode = True

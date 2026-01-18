from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/tournaments", tags=["tournaments"])


class TournamentOut(BaseModel):
	id: int
	name: str
	date: str
	location: Optional[str] = None
	description: Optional[str] = None


# Placeholder/mock data
_MOCK_TOURNAMENTS = [
	{"id": 1, "name": "Chess Championship", "date": "2026-03-12", "location": "New York", "description": "A national-level chess tournament."},
	{"id": 2, "name": "Coding Challenge", "date": "2026-04-05", "location": "Online", "description": "Algorithm and speed coding contest."},
	{"id": 3, "name": "Gaming League", "date": "2026-05-20", "location": "Los Angeles", "description": "Esports tournament with multiple games."},
]


@router.get("/", response_model=List[TournamentOut])
async def list_tournaments():
	"""Return a list of tournaments (mock data)."""
	return _MOCK_TOURNAMENTS


@router.get("/{tournament_id}", response_model=TournamentOut)
async def get_tournament(tournament_id: int):
	"""Get a single tournament by ID (mock lookup)."""
	for t in _MOCK_TOURNAMENTS:
		if t["id"] == tournament_id:
			return t
	raise HTTPException(status_code=404, detail="Tournament not found")


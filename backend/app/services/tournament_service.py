from typing import List, Optional

from pydantic import BaseModel


class Tournament(BaseModel):
	id: int
	name: str
	date: str
	location: Optional[str] = None
	description: Optional[str] = None


# Mock data used by the service
_MOCK_TOURNAMENTS = [
	{
		"id": 1,
		"name": "Chess Championship",
		"date": "2026-03-12",
		"location": "New York",
		"description": "A national-level chess tournament.",
	},
	{
		"id": 2,
		"name": "Coding Challenge",
		"date": "2026-04-05",
		"location": "Online",
		"description": "Algorithm and speed coding contest.",
	},
	{
		"id": 3,
		"name": "Gaming League",
		"date": "2026-05-20",
		"location": "Los Angeles",
		"description": "Esports tournament with multiple games.",
	},
]


def get_all_tournaments() -> List[Tournament]:
	"""Return a list of tournaments (mock data).

	Replace with DB queries in production.
	"""
	return [Tournament(**t) for t in _MOCK_TOURNAMENTS]


def get_tournament_by_id(tournament_id: int) -> Optional[Tournament]:
	"""Return a single tournament by id or None if not found."""
	for t in _MOCK_TOURNAMENTS:
		if t["id"] == tournament_id:
			return Tournament(**t)
	return None


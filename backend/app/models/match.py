from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String

from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        Index("ix_match_tournament_id", "tournament_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, nullable=False)
    round_name = Column(String(100), nullable=False, default="Round 1")
    team_a = Column(String(255), nullable=False)
    team_b = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    team_a_score = Column(Integer, nullable=True)
    team_b_score = Column(Integer, nullable=True)
    winner = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:  # pragma: no cover - developer convenience
        return f"<Match id={self.id} tournament_id={self.tournament_id} {self.team_a} vs {self.team_b}>"

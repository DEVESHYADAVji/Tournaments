from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String, UniqueConstraint

from app.core.database import Base


class TournamentRegistration(Base):
    __tablename__ = "tournament_registrations"
    __table_args__ = (
        UniqueConstraint("tournament_id", "user_id", name="uq_registration_tournament_user"),
        Index("ix_registration_tournament_id", "tournament_id"),
        Index("ix_registration_user_id", "user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    team_name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="registered")
    points = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:  # pragma: no cover - developer convenience
        return f"<TournamentRegistration id={self.id} tournament_id={self.tournament_id} user_id={self.user_id}>"

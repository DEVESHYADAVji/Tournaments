from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String, Text

from app.core.database import Base


class Announcement(Base):
    __tablename__ = "announcements"
    __table_args__ = (
        Index("ix_announcement_tournament_id", "tournament_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:  # pragma: no cover - developer convenience
        return f"<Announcement id={self.id} tournament_id={self.tournament_id}>"

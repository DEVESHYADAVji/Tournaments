from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from app.core.database import Base


class Tournament(Base):
	__tablename__ = "tournaments"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False, index=True)
	game = Column(String(100), nullable=False, index=True)
	status = Column(String(50), nullable=False, default="scheduled", index=True)
	description = Column(Text, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	def __repr__(self) -> str:  # pragma: no cover - developer convenience
		return f"<Tournament id={self.id} name={self.name} game={self.game} status={self.status}>"


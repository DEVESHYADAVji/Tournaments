from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


class Tournament(Base):
	__tablename__ = "tournaments"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False, index=True)
	game = Column(String(100), nullable=False, index=True)
	format = Column(String(100), nullable=False, default="Single Elimination")
	status = Column(String(50), nullable=False, default="scheduled", index=True)
	location = Column(String(255), nullable=True)
	description = Column(Text, nullable=True)
	start_date = Column(DateTime, nullable=True)
	end_date = Column(DateTime, nullable=True)
	prize_pool = Column(Integer, nullable=False, default=0)
	max_teams = Column(Integer, nullable=False, default=16)
	created_by_user_id = Column(Integer, nullable=True, index=True)
	created_at = Column(DateTime, default=datetime.utcnow)

	def __repr__(self) -> str:  # pragma: no cover - developer convenience
		return f"<Tournament id={self.id} name={self.name} game={self.game} status={self.status}>"


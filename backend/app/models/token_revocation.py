from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


class TokenRevocation(Base):
    __tablename__ = "token_revocations"

    id = Column(Integer, primary_key=True)
    jti = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

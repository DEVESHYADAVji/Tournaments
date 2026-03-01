from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


class AuthUser(Base):
    __tablename__ = "auth_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, default="New User")
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:  # pragma: no cover - developer convenience
        return f"<AuthUser id={self.id} email={self.email} role={self.role}>"

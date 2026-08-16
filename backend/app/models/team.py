from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String, UniqueConstraint

from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (Index("ix_teams_owner_user_id", "owner_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    game = Column(String(100), nullable=False, index=True)
    owner_user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="member")
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamInvitation(Base):
    __tablename__ = "team_invitations"
    __table_args__ = (Index("ix_team_invites_email_status", "email", "status"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    invited_by_user_id = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

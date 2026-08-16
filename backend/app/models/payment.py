from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String

from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (Index("ix_payments_user_status", "user_id", "status"),)

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    provider = Column(String(50), nullable=False, default="razorpay")
    order_id = Column(String(255), nullable=False, unique=True, index=True)
    payment_id = Column(String(255), nullable=True, unique=True, index=True)
    status = Column(String(50), nullable=False, default="created")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

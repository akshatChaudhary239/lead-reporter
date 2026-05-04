import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from ..database import Base

class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(String, unique=True, nullable=False) # Razorpay Order ID or Stripe Session ID
    payment_id = Column(String, unique=True, nullable=True) # Razorpay Payment ID or Stripe Charge ID
    status = Column(String, nullable=False) # created, captured, failed, refunded
    credits = Column(Integer, default=0)
    plan_id = Column(String, nullable=True) # starter, growth, etc.
    currency = Column(String, nullable=True)
    amount = Column(Integer, nullable=True) # Amount in cents/paise
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

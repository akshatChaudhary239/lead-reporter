import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=True)
    plan: Mapped[str] = mapped_column(String, default="free") # free, growth, unlimited
    subscription_id: Mapped[str] = mapped_column(String, nullable=True)
    free_reports_used: Mapped[int] = mapped_column(Integer, default=0)
    reports_purchased: Mapped[int] = mapped_column(Integer, default=0)
    reports_today: Mapped[int] = mapped_column(Integer, default=0) # Kept for legacy/daily tracking if needed
    reports_this_month: Mapped[int] = mapped_column(Integer, default=0)
    last_report_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_month_reset: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

Index("idx_users_email", User.email)
Index("idx_users_stripe", User.stripe_customer_id)

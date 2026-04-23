import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    website_url: Mapped[str] = mapped_column(String, nullable=False)
    google_profile_url: Mapped[str] = mapped_column(String, nullable=True)
    business_type: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending") # pending, processing, completed, failed
    scraped_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    report_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    pdf_url: Mapped[str] = mapped_column(String, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    cache_key: Mapped[str] = mapped_column(String, unique=True, nullable=True)

Index("idx_reports_user", Report.user_id)
Index("idx_reports_status", Report.status)
Index("idx_reports_cache", Report.cache_key)

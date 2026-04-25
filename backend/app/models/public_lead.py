import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, JSON, Index, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class PublicLead(Base):
    __tablename__ = "public_leads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False) # e.g. "Restaurant", "Dental"
    location: Mapped[str] = mapped_column(String, nullable=False) # City, State
    opportunity_score: Mapped[str] = mapped_column(String, nullable=False) # High, Medium, Low
    teaser_insight: Mapped[str] = mapped_column(Text, nullable=False)
    teaser_revenue_leak: Mapped[str] = mapped_column(String, nullable=True)
    report_json: Mapped[dict] = mapped_column(JSON, nullable=True) # Allow null for pending/processing
    website_url: Mapped[str] = mapped_column(String, nullable=False)
    
    # Admin & Status tracking
    status: Mapped[str] = mapped_column(String, default="completed") # pending, processing, completed, failed
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

# Indexes for fast marketplace browsing
Index("idx_public_leads_category", PublicLead.category)
Index("idx_public_leads_location", PublicLead.location)
Index("idx_public_leads_score", PublicLead.opportunity_score)
Index("idx_public_leads_freshness", PublicLead.updated_at)

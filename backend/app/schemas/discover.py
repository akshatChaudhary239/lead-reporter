from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class PublicLeadTeaser(BaseModel):
    id: UUID
    business_name: str
    category: str
    location: str
    opportunity_score: str
    teaser_insight: str
    teaser_revenue_leak: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_refreshed_at: Optional[datetime] = None
    is_unlocked: bool = False

    class Config:
        from_attributes = True

class PublicLeadFull(PublicLeadTeaser):
    report_json: Dict[str, Any]
    website_url: str
    
    class Config:
        from_attributes = True

class DiscoverResponse(BaseModel):
    leads: List[PublicLeadTeaser]
    total: int
    page: int
    size: int

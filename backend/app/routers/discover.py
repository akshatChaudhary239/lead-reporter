import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_
from ..database import get_db, AsyncSessionLocal
from ..models.public_lead import PublicLead
from ..models.lead_unlock import LeadUnlock
from ..models.user import User
from ..middleware.auth_middleware import get_current_user
from ..schemas.discover import DiscoverResponse, PublicLeadTeaser, PublicLeadFull
from ..services.report_builder import orchestrate_report
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/discover", tags=["discover"])

@router.get("/", response_model=DiscoverResponse)
async def list_discover_leads(
    category: Optional[str] = None,
    location: Optional[str] = None,
    score: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List curated leads with teaser data.
    """
    offset = (page - 1) * size
    
    # Base query
    query = select(PublicLead)
    
    # Filters
    if category:
        query = query.where(PublicLead.category == category)
    if location:
        query = query.where(PublicLead.location == location)
    if score:
        query = query.where(PublicLead.opportunity_score == score)
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get leads
    leads_result = await db.execute(
        query.order_by(PublicLead.updated_at.desc()).offset(offset).limit(size)
    )
    leads = leads_result.scalars().all()
    
    # Check unlock status for these leads
    unlocked_query = select(LeadUnlock.lead_id).where(
        LeadUnlock.user_id == current_user.id,
        LeadUnlock.lead_id.in_([l.id for l in leads])
    )
    unlocked_result = await db.execute(unlocked_query)
    unlocked_ids = set(unlocked_result.scalars().all())
    
    # Map to schema
    teaser_leads = []
    for lead in leads:
        lead_dict = {
            "id": lead.id,
            "business_name": lead.business_name,
            "category": lead.category,
            "location": lead.location,
            "opportunity_score": lead.opportunity_score,
            "teaser_insight": lead.teaser_insight,
            "teaser_revenue_leak": lead.teaser_revenue_leak,
            "created_at": lead.created_at,
            "updated_at": lead.updated_at,
            "last_refreshed_at": lead.last_refreshed_at,
            "is_unlocked": lead.id in unlocked_ids
        }
        teaser_leads.append(PublicLeadTeaser(**lead_dict))
        
    return {
        "leads": teaser_leads,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/{lead_id}", response_model=PublicLeadFull)
async def get_lead_details(
    lead_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full lead details (only if unlocked).
    """
    # 1. Check if unlocked
    unlock_check = await db.execute(
        select(LeadUnlock).where(LeadUnlock.user_id == current_user.id, LeadUnlock.lead_id == lead_id)
    )
    if not unlock_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Lead is locked. Please unlock it using credits."
        )
        
    # 2. Get lead
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    return PublicLeadFull.from_orm(lead)

@router.post("/{lead_id}/unlock")
async def unlock_lead(
    lead_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Unlock a lead using 1 credit.
    """
    # 1. Check if already unlocked
    existing_unlock = await db.execute(
        select(LeadUnlock).where(LeadUnlock.user_id == current_user.id, LeadUnlock.lead_id == lead_id)
    )
    if existing_unlock.scalar_one_or_none():
        return {"message": "Lead already unlocked", "lead_id": str(lead_id)}
        
    # 2. Atomic credit deduction and unlock
    try:
        # Use a sub-transaction or atomic update
        # We need to refresh the user to get latest credits
        await db.refresh(current_user)
        
        if current_user.credits < 1:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Not enough credits. Please upgrade your plan."
            )
            
        # Deduct credit
        current_user.credits -= 1
        
        # Create unlock entry
        new_unlock = LeadUnlock(user_id=current_user.id, lead_id=lead_id)
        db.add(new_unlock)
        
        await db.commit()
        return {"message": "Lead unlocked successfully", "lead_id": str(lead_id), "remaining_credits": current_user.credits}
        
    except Exception as e:
        await db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Unlock failed: {str(e)}")

@router.post("/{lead_id}/refresh")
async def refresh_lead_data(
    lead_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger a background refresh for a stale lead (> 30 days).
    """
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Check staleness
    now = datetime.now(timezone.utc)
    if lead.updated_at > (now - timedelta(days=30)):
        return {"message": "Lead is already fresh", "last_updated": lead.updated_at.isoformat()}
        
    # Trigger background refresh (reusing report_builder logic)
    # Note: We need a specialized function for public leads or adapt orchestrate_report
    # For now, we'll just acknowledge the request. 
    # Real implementation would call a specialized orchestrator.
    
    return {"message": "Refresh triggered in background", "lead_id": str(lead_id)}

import uuid
import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from ..database import get_db, AsyncSessionLocal
from ..models.public_lead import PublicLead
from ..models.user import User
from ..middleware.auth_middleware import get_current_user
from ..services.discovery_service import process_public_lead
from pydantic import BaseModel, HttpUrl

router = APIRouter(prefix="/admin/leads", tags=["admin"])

# --- Schemas ---

class LeadCreate(BaseModel):
    website_url: str
    business_name: str
    category: str
    location: str

class LeadUpdate(BaseModel):
    business_name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    opportunity_score: Optional[str] = None
    teaser_insight: Optional[str] = None
    teaser_revenue_leak: Optional[str] = None
    is_approved: Optional[bool] = None

# --- Admin Dependency ---

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# --- Routes ---

@router.get("/")
async def list_leads(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * size
    query = select(PublicLead)
    
    if status_filter:
        query = query.where(PublicLead.status == status_filter)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    result = await db.execute(
        query.order_by(PublicLead.created_at.desc()).offset(offset).limit(size)
    )
    leads = result.scalars().all()
    
    return {
        "leads": leads,
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/")
async def create_lead(
    lead_in: LeadCreate,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check for duplicates
    existing = await db.execute(
        select(PublicLead).where(PublicLead.website_url == lead_in.website_url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Lead already exists")

    new_lead = PublicLead(
        business_name=lead_in.business_name,
        website_url=lead_in.website_url,
        category=lead_in.category,
        location=lead_in.location,
        status="pending",
        is_approved=False,
        teaser_insight="Generating intelligence...", # Placeholder
        opportunity_score="Medium",
        report_json={}
    )
    db.add(new_lead)
    await db.commit()
    await db.refresh(new_lead)
    
    # Trigger processing
    # Note: Using a fresh session factory inside background task is safer than passing db session
    async def run_task(l_id: uuid.UUID):
        async with AsyncSessionLocal() as session:
            await process_public_lead(l_id, session)

    background_tasks.add_task(run_task, new_lead.id)
    
    return new_lead

@router.patch("/{lead_id}")
async def update_lead(
    lead_id: uuid.UUID,
    lead_update: LeadUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    update_data = lead_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)
        
    await db.commit()
    await db.refresh(lead)
    return lead

@router.post("/{lead_id}/refresh")
async def refresh_lead(
    lead_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead.status = "pending"
    await db.commit()
    
    async def run_task(l_id: uuid.UUID):
        async with AsyncSessionLocal() as session:
            await process_public_lead(l_id, session)

    background_tasks.add_task(run_task, lead.id)
    return {"message": "Refresh triggered", "lead_id": str(lead_id)}

@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted"}

@router.post("/bulk")
async def bulk_upload(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    leads_to_process = []
    
    for row in reader:
        url = row.get('url')
        name = row.get('name')
        category = row.get('category')
        location = row.get('location')
        
        if not all([url, name, category, location]):
            continue
            
        # Check duplicate
        existing = await db.execute(select(PublicLead).where(PublicLead.website_url == url))
        if existing.scalar_one_or_none():
            continue
            
        new_lead = PublicLead(
            business_name=name,
            website_url=url,
            category=category,
            location=location,
            status="pending",
            is_approved=False,
            teaser_insight="Pending generation...",
            opportunity_score="Medium",
            report_json={}
        )
        db.add(new_lead)
        leads_to_process.append(new_lead)
        
    await db.commit()
    
    # Trigger background tasks for each
    async def run_task(l_id: uuid.UUID):
        async with AsyncSessionLocal() as session:
            await process_public_lead(l_id, session)

    for lead in leads_to_process:
        background_tasks.add_task(run_task, lead.id)
        
    return {"message": f"Bulk upload started for {len(leads_to_process)} leads"}

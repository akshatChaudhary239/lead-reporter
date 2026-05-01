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
    report_json: Optional[dict] = None
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

@router.get("/{lead_id}")
async def get_lead(
    lead_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),


    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    try:
        # utf-8-sig automatically handles UTF-8 with BOM (often generated by Excel)
        decoded = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        # Fallback to windows-1252 for older Excel CSVs
        decoded = content.decode('windows-1252')
        
    # SCRUB JUNK CHARACTERS: Remove null bytes and other common invisible gremlins
    decoded = decoded.replace('\x00', '').replace('\ufeff', '')
    
    # Try multiple delimiters to find the best fit
    delimiters = [',', ';', '\t', '|']
    best_reader = None
    max_cols = 0
    
    for d in delimiters:
        test_reader = csv.DictReader(io.StringIO(decoded), delimiter=d)
        try:
            first_row = next(test_reader)
            # Re-read from start
            test_reader = csv.DictReader(io.StringIO(decoded), delimiter=d)
            col_count = len(first_row.keys())
            if col_count > max_cols:
                max_cols = col_count
                best_reader = test_reader
        except:
            continue
            
    if not best_reader:
        return {"error": "Failed to find any valid columns in CSV"}
    
    reader = best_reader
    leads_to_process = []
    
    for row in reader:
        # NORMALIZE & FIX MERGED COLUMNS:
        # If the row has only 1 key but contains commas, it's a merged line
        if len(row) == 1 and ',' in list(row.keys())[0]:
            raw_key = list(row.keys())[0]
            raw_val = list(row.values())[0]
            
            # Use a proper CSV reader to split the keys and values correctly (respecting quotes)
            key_reader = csv.reader([raw_key], delimiter=',')
            val_reader = csv.reader([raw_val], delimiter=',')
            
            actual_keys = next(key_reader, [])
            actual_values = next(val_reader, [])
            
            if len(actual_keys) == len(actual_values):
                row = dict(zip(actual_keys, actual_values))

        # Normalize keys: lowercase and strip whitespace
        normalized_row = {
            (str(k).strip().lower() if k else ''): (str(v).strip() if v else '')
            for k, v in row.items()
        }
        
        url = normalized_row.get('url') or normalized_row.get('website') or normalized_row.get('website url') or normalized_row.get('website_url')
        name = normalized_row.get('name') or normalized_row.get('business_name') or normalized_row.get('business name')
        category = normalized_row.get('category') or normalized_row.get('type') or normalized_row.get('business category')
        location = normalized_row.get('location') or normalized_row.get('city') or normalized_row.get('address')
        
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

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, HttpUrl
import os

from ..database import get_db, AsyncSessionLocal
from ..models.report import Report
from ..models.user import User
from ..middleware.auth_middleware import get_current_user
from ..services.report_builder import orchestrate_report

router = APIRouter(prefix="/reports", tags=["reports"])

class ReportCreate(BaseModel):
    business_name: str
    website_url: str
    google_profile_url: Optional[str] = None
    business_type: Optional[str] = None
    location_hint: Optional[str] = None

class ReportSummary(BaseModel):
    id: uuid.UUID
    business_name: str
    website_url: str
    status: str
    created_at: str

class ReportDetail(ReportSummary):
    report_json: Optional[dict] = None
    error_message: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_report(
    input_data: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check usage limits
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    can_proceed = False
    
    # Monthly reset logic
    if current_user.plan in ["growth", "pro"]:
        is_new_month = not current_user.last_month_reset or (now - current_user.last_month_reset) > timedelta(days=30)
        if is_new_month:
            current_user.reports_this_month = 0
            current_user.last_month_reset = now

    if current_user.plan == "pro":
        if current_user.reports_this_month < 500:
            current_user.reports_this_month += 1
            can_proceed = True
    elif current_user.plan == "growth":
        if current_user.reports_this_month < 100:
            current_user.reports_this_month += 1
            can_proceed = True
    elif current_user.reports_purchased > 0:
        current_user.reports_purchased -= 1
        can_proceed = True
    elif current_user.free_reports_used < 3:
        current_user.free_reports_used += 1
        can_proceed = True

    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usage limit reached for your plan. Please upgrade or purchase more credits."
        )
        
    # 2. Create initial report record
    new_report = Report(
        user_id=current_user.id,
        business_name=input_data.business_name,
        website_url=str(input_data.website_url),
        google_profile_url=input_data.google_profile_url,
        business_type=input_data.business_type,
        status="pending"
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    
    # 3. Add background task
    background_tasks.add_task(
        orchestrate_report,
        new_report.id,
        current_user.id,
        input_data.business_name,
        str(input_data.website_url),
        input_data.business_type,
        input_data.location_hint,
        AsyncSessionLocal # Pass the sessionmaker factory
    )
    
    return {"report_id": str(new_report.id), "status": "pending"}

@router.get("/", response_model=List[ReportSummary])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(desc(Report.created_at))
        .limit(limit)
        .offset(offset)
    )
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "business_name": r.business_name,
            "website_url": r.website_url,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        }
        for r in reports
    ]

@router.get("/{report_id}", response_model=ReportDetail)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {
        "id": report.id,
        "business_name": report.business_name,
        "website_url": report.website_url,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
        "report_json": report.report_json,
        "error_message": report.error_message
    }

@router.get("/{report_id}/pdf")
async def get_report_pdf(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status != "completed":
        raise HTTPException(status_code=400, detail="Report is not ready yet")
        
    pdf_path = os.path.abspath(os.path.join(os.getcwd(), "reports", f"{report_id}.pdf"))
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
        
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"{report.business_name}_Audit.pdf"
    )

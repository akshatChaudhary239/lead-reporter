import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from ..models.report import Report
from ..models.user import User
from .scraper import scrape_website
from .competitor import discover_competitors
from .ai_engine import generate_report, ReportInput
from .pdf_generator import generate_pdf
from ..utils.logger import logger
import os

async def orchestrate_report(
    report_id: uuid.UUID,
    user_id: uuid.UUID,
    business_name: str,
    website_url: str,
    business_type: str | None,
    location_hint: str | None,
    db_factory # Function to get a new DB session
):
    """
    Background task to generate a full report.
    """
    logger.info("orchestration_started", report_id=str(report_id))
    
    async with db_factory() as db:
        try:
            # 1. Update status to processing
            await db.execute(
                update(Report)
                .where(Report.id == report_id)
                .values(status="processing")
            )
            await db.commit()
            
            # 2. Run Scraping and Competitor Discovery concurrently
            logger.info("orchestration_scraping_and_competitors", report_id=str(report_id))
            
            scrape_task = asyncio.create_task(scrape_website(website_url))
            competitor_task = asyncio.create_task(discover_competitors(business_name, business_type, location_hint))
            
            scraped_data, competitors = await asyncio.gather(scrape_task, competitor_task, return_exceptions=True)
            
            # Handle potential exceptions from gather
            if isinstance(scraped_data, Exception):
                logger.error("orchestration_scrape_failed", error=str(scraped_data))
                scraped_data = None # Will be handled by ScrapedData default
                
            if isinstance(competitors, Exception):
                logger.error("orchestration_competitor_failed", error=str(competitors))
                competitors = []
            
            # 3. Build AI Input Context
            ai_input = ReportInput(
                business_name=business_name,
                website_url=website_url,
                business_type=business_type,
                location_hint=location_hint,
                website_summary=scraped_data,
                competitors=competitors
            )
            
            # 4. Generate AI Report
            logger.info("orchestration_ai_generation", report_id=str(report_id))
            report_json = await generate_report(ai_input)
            
            # 5. Generate PDF
            logger.info("orchestration_pdf_generation", report_id=str(report_id))
            pdf_bytes = await generate_pdf(report_json.model_dump(), business_name)
            
            # Save PDF to disk
            pdf_filename = f"{report_id}.pdf"
            reports_dir = os.path.abspath(os.path.join(os.getcwd(), "reports"))
            abs_pdf_path = os.path.join(reports_dir, pdf_filename)
            
            # Ensure reports directory exists
            os.makedirs(os.path.dirname(abs_pdf_path), exist_ok=True)
            
            with open(abs_pdf_path, "wb") as f:
                f.write(pdf_bytes)
            
            # 6. Final Update
            await db.execute(
                update(Report)
                .where(Report.id == report_id)
                .values(
                    status="completed",
                    scraped_data=scraped_data.model_dump() if scraped_data else {},
                    report_json=report_json.model_dump(),
                    pdf_url=f"/api/v1/reports/{report_id}/pdf",
                    completed_at=datetime.now(timezone.utc)
                )
            )
            
            # Decrement free reports if applicable
            # (Note: This logic should ideally be more robust, e.g. using a transaction)
            result = await db.get(User, user_id)
            if result and result.plan == "free":
                result.free_reports_used += 1
                
            await db.commit()
            logger.info("orchestration_completed", report_id=str(report_id))
            
        except Exception as e:
            logger.error("orchestration_failed", report_id=str(report_id), error=str(e))
            await db.execute(
                update(Report)
                .where(Report.id == report_id)
                .values(status="failed", error_message=str(e))
            )
            await db.commit()

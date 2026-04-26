import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..models.public_lead import PublicLead
from ..services.scraper import scrape_website
from ..services.competitor import discover_competitors
from ..services.ai_engine import generate_report, ReportInput
from ..utils.logger import logger

async def process_public_lead(lead_id: uuid.UUID, db: AsyncSession):
    """
    Background task to generate/refresh a public lead report.
    """
    lead = await db.get(PublicLead, lead_id)
    if not lead:
        logger.error("process_public_lead_not_found", lead_id=str(lead_id))
        return

    try:
        # 1. Update status to processing
        lead.status = "processing"
        await db.commit()
        await db.refresh(lead)

        logger.info("process_public_lead_started", lead_id=str(lead_id), url=lead.website_url)

        # 2. Run Scraping and Competitor Discovery
        scrape_task = asyncio.create_task(scrape_website(lead.website_url))
        competitor_task = asyncio.create_task(discover_competitors(lead.business_name, lead.category, lead.location))
        
        scraped_data, competitors = await asyncio.gather(scrape_task, competitor_task)
        
        # 3. Build AI Input Context
        ai_input = ReportInput(
            business_name=lead.business_name,
            website_url=lead.website_url,
            business_type=lead.category,
            location_hint=lead.location,
            website_summary=scraped_data,
            competitors=competitors
        )
        
        # 4. Generate AI Report
        report_json = await generate_report(ai_input)
        
        # 5. Extract teaser info
        summary = report_json.get('summary', {})
        rev_leak = summary.get('revenue_leak_estimate', {})
        
        teaser_insight = summary.get('business_model', 'No business model identified') + ". " + rev_leak.get('reasoning', '')[:200]
        teaser_leak = f"{rev_leak.get('currency', 'USD')}{rev_leak.get('min', 0)}-{rev_leak.get('max', 0)}/mo"
        
        # 6. Update PublicLead
        lead.opportunity_score = "High" if summary.get('opportunity_score', 0) > 0.7 else "Medium"
        lead.teaser_insight = teaser_insight
        lead.teaser_revenue_leak = teaser_leak
        lead.report_json = report_json
        lead.status = "completed"
        lead.error_message = None
        lead.last_refreshed_at = datetime.now(timezone.utc)
        
        await db.commit()
        logger.info("process_public_lead_completed", lead_id=str(lead_id))
        
    except Exception as e:
        logger.error("process_public_lead_exception", lead_id=str(lead_id), error=str(e), type=type(e).__name__)
        try:
            # Try to mark as failed in a fresh transaction if possible
            lead.status = "failed"
            lead.error_message = str(e)
            await db.commit()
            logger.info("process_public_lead_marked_failed", lead_id=str(lead_id))
        except Exception as commit_err:
            logger.error("process_public_lead_commit_failed", error=str(commit_err))
            await db.rollback()

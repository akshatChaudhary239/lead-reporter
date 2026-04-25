import asyncio
import uuid
import sys
import os
import argparse
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add parent directory to path to allow imports from app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import settings
from app.models.public_lead import PublicLead
from app.services.scraper import scrape_website
from app.services.competitor import discover_competitors
from app.services.ai_engine import generate_report, ReportInput
from app.utils.logger import logger, setup_logger

setup_logger()

# Database setup for the script
engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_lead(
    business_name: str, 
    website_url: str, 
    category: str, 
    location: str,
    dry_run: bool = False
):
    """
    Generate a full intelligence report for a lead and save it to public_leads.
    """
    logger.info("seed_lead_started", business_name=business_name, url=website_url)
    
    async with AsyncSessionLocal() as db:
        # 1. Check if already exists
        existing = await db.execute(
            select(PublicLead).where(PublicLead.website_url == website_url)
        )
        if existing.scalar_one_or_none():
            logger.info("seed_lead_skipping_duplicate", url=website_url)
            return

        if dry_run:
            logger.info("seed_lead_dry_run_success", business_name=business_name)
            return

        try:
            # 2. Run Scraping and Competitor Discovery
            scrape_task = asyncio.create_task(scrape_website(website_url))
            competitor_task = asyncio.create_task(discover_competitors(business_name, category, location))
            
            scraped_data, competitors = await asyncio.gather(scrape_task, competitor_task)
            
            # 3. Build AI Input Context
            ai_input = ReportInput(
                business_name=business_name,
                website_url=website_url,
                business_type=category,
                location_hint=location,
                website_summary=scraped_data,
                competitors=competitors
            )
            
            # 4. Generate AI Report
            logger.info("seed_lead_ai_generation", business_name=business_name)
            report_json = await generate_report(ai_input)
            
            # 5. Extract teaser info from AI response
            # We assume the AI provides a summary we can use
            teaser_insight = report_json.summary.business_model + ". " + report_json.summary.revenue_leak_estimate.reasoning[:200]
            teaser_leak = f"{report_json.summary.revenue_leak_estimate.currency}{report_json.summary.revenue_leak_estimate.min}-{report_json.summary.revenue_leak_estimate.max}/mo"
            
            # 6. Save to PublicLead
            new_lead = PublicLead(
                business_name=business_name,
                website_url=website_url,
                category=category,
                location=location,
                opportunity_score="High" if report_json.summary.opportunity_score > 0.7 else "Medium",
                teaser_insight=teaser_insight,
                teaser_revenue_leak=teaser_leak,
                report_json=report_json.model_dump()
            )
            
            db.add(new_lead)
            await db.commit()
            logger.info("seed_lead_completed", business_name=business_name)
            
        except Exception as e:
            logger.error("seed_lead_failed", business_name=business_name, error=str(e))
            await db.rollback()

async def main():
    parser = argparse.ArgumentParser(description="Seed public leads into GetProspectra")
    parser.add_argument("--urls", type=str, help="Comma separated list of URL:Name:Category:Location")
    parser.add_argument("--dry-run", action="store_true", help="Don't save to DB")
    parser.add_argument("--batch-size", type=int, default=5, help="Number of concurrent generations")
    
    args = parser.parse_args()
    
    if not args.urls:
        logger.error("seed_no_urls_provided")
        return

    # Example input: "https://site1.com:Site Name:Niche:City,https://site2.com:..."
    lead_inputs = []
    for item in args.urls.split(","):
        parts = item.split(":")
        if len(parts) == 4:
            lead_inputs.append({
                "url": parts[0],
                "name": parts[1],
                "category": parts[2],
                "location": parts[3]
            })

    # Process in batches to avoid overwhelming APIs
    for i in range(0, len(lead_inputs), args.batch_size):
        batch = lead_inputs[i:i + args.batch_size]
        tasks = [
            seed_lead(l["name"], l["url"], l["category"], l["location"], args.dry_run) 
            for l in batch
        ]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())

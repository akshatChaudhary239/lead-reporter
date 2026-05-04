import asyncio
import uuid
from app.database import AsyncSessionLocal
from app.models.public_lead import PublicLead
from datetime import datetime, timezone

async def recover_leads():
    async with AsyncSessionLocal() as db:
        leads = [
            PublicLead(
                business_name="Recovery Dental",
                website_url="https://recovery-dental.com",
                category="Dental",
                location="New York",
                opportunity_score="High",
                teaser_insight="Significant SEO opportunities found. High revenue leak detected.",
                teaser_revenue_leak="₹20k-50k/mo",
                is_approved=True,
                status="completed"
            ),
            PublicLead(
                business_name="Prospectra Marketing",
                website_url="https://prospectra.io",
                category="Marketing",
                location="Remote",
                opportunity_score="High",
                teaser_insight="Missing key conversion tracking and local SEO optimization.",
                teaser_revenue_leak="₹100k-200k/mo",
                is_approved=True,
                status="completed"
            )
        ]
        
        for lead in leads:
            db.add(lead)
        
        await db.commit()
        print(f"Successfully injected {len(leads)} recovery leads.")

if __name__ == "__main__":
    asyncio.run(recover_leads())

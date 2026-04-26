import asyncio
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.public_lead import PublicLead
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PublicLead).where(PublicLead.business_name == 'Regency Cafe'))
        lead = result.scalars().first()
        if lead:
            print(f"ID: {lead.id}")
            print(f"Status: {lead.status}")
            print(f"Approved: {lead.is_approved}")
            print(f"Teaser: {lead.teaser_insight[:50]}...")
        else:
            print("Lead not found")

if __name__ == "__main__":
    asyncio.run(check())

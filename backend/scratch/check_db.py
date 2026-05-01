import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.public_lead import PublicLead

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PublicLead).order_by(PublicLead.created_at.desc()).limit(10))
        leads = result.scalars().all()
        print(f'Total recent leads: {len(leads)}')
        for l in leads:
            print(f'ID: {l.id}, Name: {l.business_name}, Status: {l.status}, Created: {l.created_at}')

asyncio.run(main())

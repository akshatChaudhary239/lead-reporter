import asyncio
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.report import Report
from app.models.public_lead import PublicLead
from app.models.lead_unlock import LeadUnlock

async def check_data():
    async with AsyncSessionLocal() as db:
        user_count = await db.execute(select(func.count(User.id)))
        report_count = await db.execute(select(func.count(Report.id)))
        public_lead_count = await db.execute(select(func.count(PublicLead.id)))
        unlock_count = await db.execute(select(func.count(LeadUnlock.id)))
        
        users = await db.execute(select(User.email, User.is_admin, User.full_name))
        
        print(f"Total Users: {user_count.scalar()}")
        print(f"Total Reports (Tactical Assets): {report_count.scalar()}")
        print(f"Total Public Leads (Opportunities): {public_lead_count.scalar()}")
        print(f"Total Lead Unlocks: {unlock_count.scalar()}")
        
        print("\nRegistered Users:")
        for user in users.all():
            print(f"- {user.email} (Name: {user.full_name}, Admin: {user.is_admin})")

if __name__ == "__main__":
    asyncio.run(check_data())

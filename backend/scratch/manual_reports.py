import asyncio
import uuid
from app.database import AsyncSessionLocal
from app.models.report import Report
from app.models.user import User
from sqlalchemy import select
from datetime import datetime, timezone

async def recover_reports():
    async with AsyncSessionLocal() as db:
        # Get your user ID
        res = await db.execute(select(User).where(User.email == "chaudharyakshat239@gmail.com"))
        user = res.scalar_one_or_none()
        
        if not user:
            print("User not found.")
            return

        reports = [
            Report(
                user_id=user.id,
                business_name="Restored Lead A",
                website_url="https://lead-a.com",
                status="completed",
                scraped_data={"summary": "Restored data"},
                report_json={"summary": {"business_model": "Restored"}},
                created_at=datetime.now(timezone.utc)
            ),
            Report(
                user_id=user.id,
                business_name="Restored Lead B",
                website_url="https://lead-b.com",
                status="completed",
                scraped_data={"summary": "Restored data"},
                report_json={"summary": {"business_model": "Restored"}},
                created_at=datetime.now(timezone.utc)
            )
        ]
        
        for r in reports:
            db.add(r)
        
        await db.commit()
        print(f"Successfully injected {len(reports)} recovery reports for {user.email}.")

if __name__ == "__main__":
    asyncio.run(recover_reports())

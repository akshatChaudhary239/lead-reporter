import asyncio
from app.database import engine, Base
# Import ALL models here so Base knows about them
from app.models.user import User
from app.models.payment_log import PaymentLog
from app.models.public_lead import PublicLead
from app.models.lead_unlock import LeadUnlock
from app.models.report import Report
from app.models.usage import UsageEvent, Payment

async def init_models():
    print("Syncing database models...")
    async with engine.begin() as conn:
        # For development, we drop and recreate to ensure schema changes apply
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database sync complete.")

if __name__ == "__main__":
    asyncio.run(init_models())

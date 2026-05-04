import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def scan_db():
    async with AsyncSessionLocal() as db:
        # 1. List all tables
        result = await db.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        tables = [row[0] for row in result.all()]
        print(f"Tables found: {', '.join(tables)}")
        
        # 2. Check counts for all relevant tables
        for table in tables:
            try:
                count_res = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_res.scalar()
                print(f"- {table}: {count} records")
            except Exception as e:
                print(f"- {table}: Error checking count ({e})")

if __name__ == "__main__":
    asyncio.run(scan_db())

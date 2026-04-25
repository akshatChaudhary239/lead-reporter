import asyncio
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def set_admin():
    async with AsyncSessionLocal() as db:
        # Get all users and set them all as admin for now to ensure the user has access
        # In production, we would target a specific email.
        result = await db.execute(select(User))
        users = result.scalars().all()
        for user in users:
            user.is_admin = True
            print(f"Set {user.email} as admin")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(set_admin())

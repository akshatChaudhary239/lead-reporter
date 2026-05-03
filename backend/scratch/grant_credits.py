import asyncio
import sys
import os
from sqlalchemy import select, update

# Add parent directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models.user import User

async def grant_credits(email: str, amount: int):
    async with AsyncSessionLocal() as session:
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User {email} not found")
            return
        
        await session.execute(
            update(User)
            .where(User.email == email)
            .values(credits=amount)
        )
        await session.commit()
        print(f"Successfully granted {amount} credits to {email}")

if __name__ == "__main__":
    email = "chaudharyakshat239@gmail.com"
    amount = 10000
    asyncio.run(grant_credits(email, amount))

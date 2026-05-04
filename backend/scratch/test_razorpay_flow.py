import asyncio
import json
import hmac
import hashlib
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.payment_log import PaymentLog
from app.services.billing_service import BillingService
from app.config import settings

async def simulate_lifecycle():
    print("Starting Razorpay Lifecycle Test...")
    async with AsyncSessionLocal() as db:
        # 0. Setup: Create or find a test user
        test_email = "test_billing_user@example.com"
        result = await db.execute(select(User).where(User.email == test_email))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email=test_email,
                password_hash="fake_hash",
                full_name="Test Billing",
                credits=0,
                reports_purchased=0
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"Created test user: {user.id}")
        
        initial_credits = user.reports_purchased
        order_id = f"order_{uuid.uuid4().hex[:8]}"
        payment_id = f"pay_{uuid.uuid4().hex[:8]}"
        
        print(f"Initial Credits: {initial_credits}")
        print(f"Simulating Order: {order_id}")

        # 1. Simulate Order Creation in Log
        log = PaymentLog(
            user_id=user.id,
            order_id=order_id,
            status="created",
            plan_id="starter",
            credits=20,
            amount=49900,
            currency="INR"
        )
        db.add(log)
        await db.commit()
        print("Order log created.")

        # 2. First Webhook Trigger (Source of Truth)
        print("Triggering first webhook...")
        fulfilled = await BillingService.fulfill_order(
            db, order_id, payment_id, str(user.id), "starter", 49900, "INR"
        )
        print(f"Fulfilled: {fulfilled}")
        
        await db.refresh(user)
        print(f"Credits after Webhook 1: {user.reports_purchased}")

        # 3. Second Webhook Trigger (Idempotency Check)
        print("Triggering duplicate webhook...")
        fulfilled_dup = await BillingService.fulfill_order(
            db, order_id, payment_id, str(user.id), "starter", 49900, "INR"
        )
        await db.refresh(user)
        print(f"Idempotency check: {user.reports_purchased} (Should still be {initial_credits + 20})")

        # 4. Manual Verification Trigger (Frontend Path)
        print("Simulating manual frontend verification...")
        fulfilled_manual = await BillingService.fulfill_order(
            db, order_id, payment_id, str(user.id), "starter", 49900, "INR"
        )
        await db.refresh(user)
        print(f"Manual verify check: {user.reports_purchased} (Should still be {initial_credits + 20})")

        # 5. Final Result
        if user.reports_purchased == initial_credits + 20:
            print("\nSUCCESS: Billing architecture is robust and idempotent!")
        else:
            print("\nFAILURE: Credit allocation count is incorrect.")

if __name__ == "__main__":
    asyncio.run(simulate_lifecycle())

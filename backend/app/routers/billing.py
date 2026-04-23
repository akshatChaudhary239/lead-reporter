import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..database import get_db
from ..config import settings
from ..models.user import User
from ..middleware.auth_middleware import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/billing", tags=["billing"])
stripe.api_key = settings.STRIPE_SECRET_KEY

class CheckoutRequest(BaseModel):
    plan_id: str # starter, growth, pro
    currency: str # inr, usd

@router.post("/checkout")
async def create_checkout_session(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    price_id = None
    mode = "subscription"
    
    # Mapping regional prices
    if req.currency.lower() == "inr":
        if req.plan_id == "starter":
            price_id = settings.STRIPE_PRICE_STARTER_INR
            mode = "payment"
        elif req.plan_id == "growth":
            price_id = settings.STRIPE_PRICE_GROWTH_INR
        elif req.plan_id == "pro":
            price_id = settings.STRIPE_PRICE_PRO_INR
    else: # Default to USD
        if req.plan_id == "starter":
            price_id = settings.STRIPE_PRICE_STARTER_USD
            mode = "payment"
        elif req.plan_id == "growth":
            price_id = settings.STRIPE_PRICE_GROWTH_USD
        elif req.plan_id == "pro":
            price_id = settings.STRIPE_PRICE_PRO_USD

    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan or currency selected")

    try:
        # Create customer if doesn't exist
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={"user_id": str(current_user.id)}
            )
            current_user.stripe_customer_id = customer.id
            await db.commit()

        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode=mode,
            success_url=f"http://localhost:3000/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"http://localhost:3000/pricing",
            metadata={
                "user_id": str(current_user.id),
                "plan_id": req.plan_id
            }
        )
        return {"url": session.url}
    except Exception as e:
        logger.error("stripe_checkout_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@router.get("/verify-session/{session_id}")
async def verify_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            user_id = session.metadata.get("user_id")
            plan_id = session.metadata.get("plan_id")
            
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    # Update user plan/quota
                    # In a real app, you'd check if this session was already processed
                    if plan_id == "starter":
                        user.reports_purchased += 5
                    else:
                        user.plan = plan_id
                        user.subscription_id = session.get("subscription")
                        user.reports_this_month = 0
                        from datetime import datetime, timezone
                        user.last_month_reset = datetime.now(timezone.utc)
                    
                    await db.commit()
                    return {"status": "success", "plan": user.plan}
        return {"status": "pending"}
    except Exception as e:
        logger.error("session_verification_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Verification failed")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        return {"error": str(e)}

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan_id = session["metadata"].get("plan_id")
        
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                if plan_id == "starter":
                    user.reports_purchased += 5 # Starter bundle is 5 reports
                else:
                    user.plan = plan_id
                    user.subscription_id = session.get("subscription")
                    # Reset monthly counter on new subscription
                    user.reports_this_month = 0
                    from datetime import datetime, timezone
                    user.last_month_reset = datetime.now(timezone.utc)
                await db.commit()
                logger.info("payment_success", user_id=user_id, plan=plan_id)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        result = await db.execute(select(User).where(User.subscription_id == subscription["id"]))
        user = result.scalar_one_or_none()
        if user:
            user.plan = "free"
            user.subscription_id = None
            await db.commit()
            logger.info("subscription_canceled", user_id=str(user.id))

    return {"status": "success"}

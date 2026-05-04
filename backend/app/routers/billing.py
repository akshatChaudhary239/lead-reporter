import razorpay
import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List

from ..database import get_db
from ..config import settings
from ..models.user import User
from ..models.payment_log import PaymentLog
from ..middleware.auth_middleware import get_current_user
from ..utils.logger import logger
from ..services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize clients
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class RazorpayOrderRequest(BaseModel):
    plan_id: str
    currency: str = "INR"

class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# --- RAZORPAY ENDPOINTS ---

@router.post("/razorpay/order")
async def create_razorpay_order(
    req: RazorpayOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    amount = 0
    credits_to_add = 0
    
    if req.plan_id == "starter":
        amount = 49900 # 499 INR
        credits_to_add = 20
    elif req.plan_id == "growth":
        amount = 149900 # 1499 INR
        credits_to_add = 70
    elif req.plan_id == "pro":
        amount = 499900 # 4999 INR
        credits_to_add = 100
    else:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    try:
        order_data = {
            "amount": amount,
            "currency": req.currency,
            "receipt": f"receipt_{current_user.id}_{uuid.uuid4().hex[:6]}",
            "notes": {
                "user_id": str(current_user.id),
                "plan_id": req.plan_id,
                "credits": credits_to_add
            }
        }
        order = razorpay_client.order.create(data=order_data)
        
        # Log the order creation with the promised credits
        new_log = PaymentLog(
            user_id=current_user.id,
            order_id=order["id"],
            status="created",
            plan_id=req.plan_id,
            credits=credits_to_add, # Locked in at creation
            amount=amount,
            currency=req.currency
        )
        db.add(new_log)
        await db.commit()
        
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": settings.RAZORPAY_KEY_ID
        }
    except Exception as e:
        logger.error("razorpay_order_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create Razorpay order")

@router.post("/razorpay/verify")
async def verify_razorpay_payment(
    req: RazorpayVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Frontend-triggered verification. 
    Does NOT fulfill the order. Only returns status.
    Fulfillment happens ONLY in the webhook.
    """
    try:
        params_dict = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Check if log exists
        result = await db.execute(select(PaymentLog).where(PaymentLog.order_id == req.razorpay_order_id))
        log = result.scalar_one_or_none()
        
        if log:
            return {"status": "success", "message": "Payment verified. Credits will be allocated shortly."}
        
        return {"status": "pending"}
    except Exception as e:
        logger.error("razorpay_signature_verification_failed", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid payment signature")

@router.get("/razorpay/status/{order_id}")
async def check_razorpay_status(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Poll endpoint for the frontend to check if the webhook 
    has fulfilled the order.
    """
    result = await db.execute(select(PaymentLog).where(PaymentLog.order_id == order_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Order not found")
        
    return {
        "order_id": log.order_id,
        "status": log.status, # created, captured, failed
        "credits_allocated": log.credits > 0
    }

@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: str = Header(None)
):
    body = await request.body()
    
    # Verify webhook signature
    expected_signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if expected_signature != x_razorpay_signature:
        logger.warning("razorpay_webhook_signature_mismatch")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    data = json.loads(body)
    event = data.get("event")

    if event == "payment.captured":
        payment = data["payload"]["payment"]["entity"]
        order_id = payment.get("order_id")
        payment_id = payment.get("id")
        
        # Retrieve notes from the order (as Razorpay doesn't always include them in payment entity)
        order = razorpay_client.order.fetch(order_id)
        notes = order.get("notes", {})
        user_id = notes.get("user_id")
        plan_id = notes.get("plan_id")
        amount = payment.get("amount")
        currency = payment.get("currency")

        if user_id and plan_id:
            fulfilled = await BillingService.fulfill_order(
                db, order_id, payment_id, user_id, plan_id, amount, currency
            )
            if fulfilled:
                return {"status": "ok"}
    
    return {"status": "ignored"}

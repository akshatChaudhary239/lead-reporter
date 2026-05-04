from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.user import User
from ..models.payment_log import PaymentLog
from ..utils.logger import logger
from datetime import datetime, timezone

class BillingService:
    @staticmethod
    async def fulfill_order(db: AsyncSession, order_id: str, payment_id: str, user_id: str, plan_id: str, amount: int, currency: str):
        """
        Idempotent fulfillment of an order with row-level locking.
        Ensures credits are added ONLY ONCE per order_id/payment_id.
        """
        try:
            # 1. Start atomic block and lock the log row for this order
            # We use with_for_update() to prevent race conditions between Webhook and Manual Verify
            result = await db.execute(
                select(PaymentLog).where(PaymentLog.order_id == order_id).with_for_update()
            )
            log = result.scalar_one_or_none()
            
            if log and log.status == "captured":
                logger.info("order_already_fulfilled", order_id=order_id, user_id=user_id)
                return True

            # 2. Check for duplicate payment_id (global idempotency)
            if payment_id:
                existing_payment = await db.execute(
                    select(PaymentLog).where(PaymentLog.payment_id == payment_id, PaymentLog.status == "captured")
                )
                if existing_payment.scalar_one_or_none():
                    logger.info("payment_id_already_exists", payment_id=payment_id)
                    return True

            # 3. Create or update the log
            if not log:
                log = PaymentLog(
                    user_id=user_id,
                    order_id=order_id,
                    status="processing",
                    plan_id=plan_id,
                    amount=amount,
                    currency=currency
                )
                db.add(log)
            
            log.payment_id = payment_id
            log.status = "captured"
            
            # 4. Allocate Credits (Purely based on what was promised in the log)
            result = await db.execute(select(User).where(User.id == user_id).with_for_update())
            user = result.scalar_one_or_none()
            
            if user:
                # Add the credits stored in the log
                user.reports_purchased += log.credits
                
                await db.commit()
                logger.info("order_fulfilled_successfully", order_id=order_id, payment_id=payment_id, credits_added=log.credits)
                return True
                
            return False
        except Exception as e:
            await db.rollback()
            logger.error("fulfillment_critical_failure", error=str(e), order_id=order_id)
            raise e

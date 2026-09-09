import hashlib
import hmac
import json
import time
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import async_session
from app.core.security import require_admin, require_user
from app.models.auth_user import AuthUser
from app.models.payment import Payment
from app.models.payment_webhook_event import PaymentWebhookEvent
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration

router = APIRouter(prefix="/payments", tags=["payments"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]


class PaymentOut(BaseModel):
    id: int
    tournament_id: int
    amount: int
    currency: str
    order_id: str
    payment_id: str | None
    status: str
    model_config = {"from_attributes": True}


class VerifyPaymentIn(BaseModel):
    order_id: str = Field(min_length=5, max_length=255)
    payment_id: str = Field(min_length=5, max_length=255)
    signature: str = Field(min_length=20, max_length=255)


class EntryFeeUpdate(BaseModel):
    amount: int = Field(ge=0)


async def _require_gateway():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay payment gateway is not configured")


async def _fetch_razorpay_payment(payment_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"https://api.razorpay.com/v1/payments/{payment_id}",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            )
            response.raise_for_status()
            payment = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Unable to verify payment with Razorpay") from exc
    if not isinstance(payment, dict):
        raise HTTPException(status_code=502, detail="Razorpay returned an invalid payment response")
    return payment


@router.patch("/tournaments/{tournament_id}/fee", response_model=dict)
async def set_entry_fee(tournament_id: int, payload: EntryFeeUpdate, _: AuthUser = Depends(require_admin)):
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        tournament.entry_fee = payload.amount
        await session.commit()
    return {"success": True, "entry_fee": payload.amount}


@router.post("/tournaments/{tournament_id}/order", response_model=dict)
async def create_payment_order(tournament_id: int, current_user: CurrentUser):
    await _require_gateway()
    async with async_session() as session:
        tournament = (await session.execute(select(Tournament).where(Tournament.id == tournament_id))).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if tournament.entry_fee <= 0:
            raise HTTPException(status_code=400, detail="This tournament does not have a paid entry fee")
        registration = (await session.execute(select(TournamentRegistration).where(TournamentRegistration.tournament_id == tournament_id, TournamentRegistration.user_id == current_user.id))).scalar_one_or_none()
        if not registration:
            raise HTTPException(status_code=400, detail="Register for the tournament before paying the entry fee")
        existing = (await session.execute(select(Payment).where(Payment.tournament_id == tournament_id, Payment.user_id == current_user.id, Payment.status.in_(["created", "paid"])).order_by(Payment.id.desc()))).scalar_one_or_none()
        if existing:
            return {"id": existing.id, "order_id": existing.order_id, "amount": existing.amount, "currency": existing.currency, "status": existing.status}
        amount = tournament.entry_fee

    payload = {"amount": amount * 100, "currency": "INR", "receipt": f"tournament_{tournament_id}_user_{current_user.id}", "notes": {"tournament_id": str(tournament_id), "user_id": str(current_user.id)}}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post("https://api.razorpay.com/v1/orders", json=payload, auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            response.raise_for_status()
            order = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Unable to create payment order") from exc

    async with async_session() as session:
        payment = Payment(tournament_id=tournament_id, user_id=current_user.id, amount=amount, currency="INR", order_id=order["id"], status="created")
        session.add(payment)
        await session.commit()
        await session.refresh(payment)
    return {"id": payment.id, "order_id": payment.order_id, "amount": payment.amount, "currency": payment.currency, "status": payment.status}


@router.get("/me", response_model=list[PaymentOut])
async def list_my_payments(current_user: CurrentUser):
    async with async_session() as session:
        payments = (await session.execute(select(Payment).where(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()))).scalars().all()
    return payments


@router.post("/verify", response_model=PaymentOut)
async def verify_payment(payload: VerifyPaymentIn, current_user: CurrentUser):
    await _require_gateway()
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), f"{payload.order_id}|{payload.payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    razorpay_payment = await _fetch_razorpay_payment(payload.payment_id)
    if razorpay_payment.get("order_id") != payload.order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to the supplied order")
    if razorpay_payment.get("status") != "captured":
        raise HTTPException(status_code=400, detail="Payment has not been captured")

    async with async_session() as session:
        payment = (await session.execute(select(Payment).where(Payment.order_id == payload.order_id, Payment.user_id == current_user.id))).scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment order not found")
        expected_amount = payment.amount * 100
        if razorpay_payment.get("amount") != expected_amount or razorpay_payment.get("currency") != payment.currency:
            raise HTTPException(status_code=400, detail="Payment amount or currency does not match the tournament entry fee")
        payment.payment_id = payload.payment_id
        payment.status = "paid"
        await session.commit()
        await session.refresh(payment)
    return payment


@router.post("/webhook", response_model=dict)
async def payment_webhook(request: Request):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay webhook secret is not configured")
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    event_id = request.headers.get("x-razorpay-event-id", "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing webhook event id")
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc

    created_at = payload.get("created_at")
    if isinstance(created_at, int) and abs(time.time() - created_at) > 300:
        raise HTTPException(status_code=400, detail="Stale webhook event")

    async with async_session() as session:
        duplicate = (await session.execute(select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_id == event_id))).scalar_one_or_none()
        if duplicate:
            return {"success": True, "duplicate": True}
        session.add(PaymentWebhookEvent(event_id=event_id))
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            return {"success": True, "duplicate": True}

        event = payload.get("event")
        order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = order_entity.get("id") or payment_entity.get("order_id")
        if not order_id:
            await session.commit()
            return {"success": True, "ignored": True}
        status_value = "paid" if event in {"order.paid", "payment.captured"} else "failed" if event == "payment.failed" else None
        if status_value:
            payment = (await session.execute(select(Payment).where(Payment.order_id == order_id))).scalar_one_or_none()
            if payment and payment.status != "paid":
                payment.status = status_value
                payment.payment_id = payment_entity.get("id") or payment.payment_id
        await session.commit()
    return {"success": True}

from typing import Annotated
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.core.security import require_user
from app.models.auth_user import AuthUser

router = APIRouter(prefix="/payments", tags=["payments"])
CurrentUser = Annotated[AuthUser, Depends(require_user)]

@router.get("/config", response_model=dict)
async def payment_config(_: CurrentUser):
    return {"configured": bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET), "key_id": settings.RAZORPAY_KEY_ID}

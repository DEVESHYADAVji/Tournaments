from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/", tags=["root"])
async def root():
    return {"service": "Tournaments API", "status": "ok"}


@router.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# Include feature routers under /api/*
from .auth.auth_routes import router as auth_router
from .ai.ocr_routes import router as ai_router
from .tournaments.tournament_routes import router as tournaments_router

router.include_router(auth_router)
router.include_router(ai_router)
router.include_router(tournaments_router)


__all__ = ["router"]

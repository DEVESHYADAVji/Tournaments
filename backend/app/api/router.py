from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/", tags=["root"])
async def root():
    return {"service": "Tournaments API", "status": "ok"}


@router.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


from .ai.ocr_routes import router as ai_router
from .auth.auth_routes import router as auth_router
from .notifications.notification_routes import router as notifications_router
from .teams.team_routes import router as teams_router
from .tournaments.registration_ops_routes import router as registration_ops_router
from .tournaments.tournament_ops_routes import router as tournament_ops_router
from .tournaments.tournament_routes import router as tournaments_router

router.include_router(auth_router)
router.include_router(ai_router)
router.include_router(notifications_router)
router.include_router(teams_router)
router.include_router(registration_ops_router)
router.include_router(tournament_ops_router)
router.include_router(tournaments_router)


__all__ = ["router"]

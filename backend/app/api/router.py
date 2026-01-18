from fastapi import APIRouter

from app.core.config import settings

api_router = APIRouter()


@api_router.get("/", tags=["root"])
async def root():
    return {"service": settings.APP_NAME, "status": "ok"}


# Versioned API router mounted at /api/v1
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])


@v1_router.get("/health", tags=["health"])
async def health_v1():
    return {"status": "ok", "version": "v1"}


# Placeholder: include sub-routers here (e.g., tournaments, auth, users)
# from . import tournaments, auth, users
# v1_router.include_router(tournaments.router)
# v1_router.include_router(auth.router)
# v1_router.include_router(users.router)


__all__ = ["api_router", "v1_router"]

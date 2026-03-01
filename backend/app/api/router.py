from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/", tags=["root"])
async def root():
    return {"service": "Tournaments API", "status": "ok"}


# Versioned API router mounted at /api/v1
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])


@v1_router.get("/health", tags=["health"])
async def health_v1():
    return {"status": "ok", "version": "v1"}


# Include feature routers under /api/v1/*
from .v1.auth.auth_routes import router as auth_router
from .v1.tournaments.tournament_routes import router as tournaments_router

v1_router.include_router(auth_router)
v1_router.include_router(tournaments_router)


__all__ = ["api_router", "v1_router"]

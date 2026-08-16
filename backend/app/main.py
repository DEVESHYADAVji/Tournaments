import os
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.auth.auth_routes import seed_default_auth_users
from .api.router import router as api_router
from .api.tournaments.tournament_routes import seed_sample_tournaments
from .core.config import settings
from .core.database import init_db
from .models import announcement as _announcement_model  # noqa: F401
from .models import auth_user as _auth_user_model  # noqa: F401
from .models import match as _match_model  # noqa: F401
from .models import team as _team_model  # noqa: F401
from .models import tournament as _tournament_model  # noqa: F401
from .models import tournament_registration as _registration_model  # noqa: F401
from .models import user as _user_model  # noqa: F401

_START_TIME = time.time()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="API for tournament management. Use Swagger UI to test endpoints.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
async def startup_event() -> None:
    await init_db()
    await seed_default_auth_users()
    await seed_sample_tournaments()


@app.get("/health", tags=["health"])
async def health():
    uptime = int(time.time() - _START_TIME)
    return {
        "status": "ok",
        "uptime_seconds": uptime,
        "env": os.environ.get("ENV", os.environ.get("PYTHON_ENV", "development")),
    }


app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

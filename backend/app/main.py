from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import time

from .api.router import api_router, v1_router
from .api.v1.auth.auth_routes import seed_default_auth_users
from .api.v1.tournaments.tournament_routes import seed_sample_tournaments
from .core.database import init_db
from .models import announcement as _announcement_model  # noqa: F401
from .models import auth_user as _auth_user_model  # noqa: F401
from .models import match as _match_model  # noqa: F401
from .models import tournament as _tournament_model  # noqa: F401
from .models import tournament_registration as _registration_model  # noqa: F401
from .models import user as _user_model  # noqa: F401

_START_TIME = time.time()

app = FastAPI(
	title="Tournaments API",
	version="0.1.0",
	description="API for tournament management. Use Swagger UI to test endpoints.",
	docs_url="/docs",
	redoc_url="/redoc",
	openapi_url="/openapi.json",
)

# Enable CORS for development. Narrow this in production.
app.add_middleware(
	CORSMiddleware,
	# Allow the frontend dev server origin
	allow_origins=["http://localhost:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event() -> None:
	"""Initialize DB schema on app startup."""
	await init_db()
	await seed_default_auth_users()
	await seed_sample_tournaments()


@app.get("/health", tags=["health"])
async def health():
	"""Health check endpoint."""
	uptime = int(time.time() - _START_TIME)
	return {
		"status": "ok",
		"uptime_seconds": uptime,
		"env": os.environ.get("ENV", os.environ.get("PYTHON_ENV", "development")),
	}

# Mount API routers so all endpoints appear in Swagger.
app.include_router(api_router)
app.include_router(v1_router)


if __name__ == "__main__":
	# Run with: python backend/app/main.py
	import uvicorn

	port = int(os.environ.get("PORT", 8000))
	uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

#uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

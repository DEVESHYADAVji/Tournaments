
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import time

_START_TIME = time.time()

app = FastAPI(title="Tournaments API", version="0.1.0")

# Enable CORS for development. Narrow this in production.
app.add_middleware(
	CORSMiddleware,
	# Allow the frontend dev server origin
	allow_origins=["http://localhost:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health():
	"""Health check endpoint."""
	uptime = int(time.time() - _START_TIME)
	return {
		"status": "ok",
		"uptime_seconds": uptime,
		"env": os.environ.get("ENV", os.environ.get("PYTHON_ENV", "development")),
	}


if __name__ == "__main__":
	# Run with: python backend/app/main.py
	import uvicorn

	port = int(os.environ.get("PORT", 8000))
	uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

#uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
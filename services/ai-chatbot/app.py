
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import datetime


app = FastAPI(title="AI Chatbot Service")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class ChatRequest(BaseModel):
	message: str
	context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
	success: bool
	reply: str
	timestamp: str


@app.get("/", tags=["root"])
async def root():
	return {"service": "ai-chatbot", "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
	return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
	"""Return a simulated AI reply for the provided message."""
	ts = datetime.utcnow().isoformat()
	ctx_info = f" Context keys={list(req.context.keys())}" if req.context else ""
	reply = f"Simulated reply to '{req.message}' at {ts}.{ctx_info}"
	return ChatResponse(success=True, reply=reply, timestamp=ts)


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)


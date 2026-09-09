from openai import AsyncOpenAI

from app.core.config import settings


def get_ai_client() -> AsyncOpenAI:
    if not settings.API_KEY:
        raise RuntimeError("API_KEY is not configured")
    return AsyncOpenAI(
        api_key=settings.API_KEY,
        base_url=settings.AI_API_BASE_URL.rstrip("/"),
        timeout=settings.AI_CHATBOT_OLLAMA_TIMEOUT_SECONDS,
    )
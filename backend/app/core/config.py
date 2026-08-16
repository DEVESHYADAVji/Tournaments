import json
from pathlib import Path
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_FILE = BASE_DIR.parent / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "Tournaments API"
    DEBUG: bool = False
    API_PREFIX: str = "/api"
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    SQLALCHEMY_DATABASE_URI: Optional[str] = "sqlite+aiosqlite:///./tournaments.db"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    SEED_ADMIN_EMAIL: Optional[str] = None
    SEED_ADMIN_PASSWORD: Optional[str] = None
    SEED_USER_EMAIL: Optional[str] = None
    SEED_USER_PASSWORD: Optional[str] = None
    AI_CHATBOT_OLLAMA_BASE_URL: str = "http://localhost:11434"
    AI_CHATBOT_OLLAMA_MODEL: str = "deepseek-v3.1:671b-cloud"
    AI_CHATBOT_OLLAMA_TIMEOUT_SECONDS: int = 45
    PROJECT_ROOT: Path = BASE_DIR

    model_config = SettingsConfigDict(env_file=str(ROOT_ENV_FILE), env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _assemble_cors_origins(cls, v):
        if isinstance(v, str):
            candidate = v.strip()
            if not candidate:
                return []
            if candidate.startswith("[") and candidate.endswith("]"):
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in candidate.split(",") if item.strip()]
        if isinstance(v, (list, tuple)):
            return [str(item).strip() for item in v if str(item).strip()]
        return v


settings = Settings()

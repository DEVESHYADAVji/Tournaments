from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ollama_timeout_seconds: int = Field(default=180)
    max_image_size_mb: int = Field(default=10)

    model_config = SettingsConfigDict(
        env_prefix="AI_CHATBOT_",
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

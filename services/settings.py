from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ocr_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ollama_timeout_seconds: int = Field(default=180)
    max_image_size_mb: int = Field(default=10)
    data_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "data")

    model_config = SettingsConfigDict(
        env_prefix="AI_CHATBOT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)

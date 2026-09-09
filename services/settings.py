from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Ollama Cloud exposes an OpenAI-compatible API.
    api_key: Optional[str] = Field(default=None, validation_alias="API_KEY")
    ai_api_base_url: str = Field(default="https://ollama.com/v1", validation_alias="AI_API_BASE_URL")
    ai_model: str = Field(default="gpt-oss:120b", validation_alias="AI_MODEL")
    ocr_model: str = Field(default="gemma4:31b-cloud", validation_alias="AI_CHATBOT_OCR_MODEL")
    ollama_timeout_seconds: int = Field(default=180)
    help_chatbot_temperature: float = Field(default=0.05)
    help_chatbot_min_relevance: float = Field(default=0.08)

    # File and image settings
    max_image_size_mb: int = Field(default=10)
    data_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent / "data")

    model_config = SettingsConfigDict(
        env_prefix="AI_CHATBOT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.data_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

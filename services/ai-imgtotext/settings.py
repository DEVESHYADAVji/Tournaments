from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    data_dir: Path = Field(default=Path(__file__).parent / "data")
    ocr_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ollama_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_timeout_seconds: int = Field(default=180)
    max_image_size_mb: int = Field(default=10)

    model_config = SettingsConfigDict(
        env_prefix="AI_OCR_",
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure data directory exists
        self.data_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

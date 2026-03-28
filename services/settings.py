from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Ollama and AI model settings
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="deepseek-v3.1:671b-cloud")
    ocr_model: str = Field(default="qwen3-vl:235b-cloud")
    ollama_timeout_seconds: int = Field(default=180)
    help_chatbot_temperature: float = Field(default=0.05)
    
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
        # Ensure data directory exists
        self.data_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

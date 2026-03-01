from pathlib import Path
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_FILE = BASE_DIR.parent / ".env"


class Settings(BaseSettings):
	# App
	APP_NAME: str = "Tournaments API"
	DEBUG: bool = False
	API_V1_STR: str = "/api/v1"

	# Security
	SECRET_KEY: str = "changeme"
	ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

	# Database
	SQLALCHEMY_DATABASE_URI: Optional[str] = None

	# CORS
	CORS_ORIGINS: List[str] = ["*"]

	# Other
	PROJECT_ROOT: Path = BASE_DIR

	model_config = SettingsConfigDict(
		env_file=str(ROOT_ENV_FILE),
		env_file_encoding="utf-8",
		case_sensitive=True,
		extra="ignore",
	)

	@field_validator("CORS_ORIGINS", mode="before")
	@classmethod
	def _assemble_cors_origins(cls, v):
		if isinstance(v, str):
			# allow comma separated string in env
			return [i.strip() for i in v.split(",") if i.strip()]
		if isinstance(v, (list, tuple)):
			return list(v)
		return v


settings = Settings()


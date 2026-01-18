from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from .config import settings


# Build the async DB URL. Expect a MySQL+asyncmy URL in settings.SQLALCHEMY_DATABASE_URI
DEFAULT_DB = "mysql+asyncmy://root:password@127.0.0.1:3306/tournaments"
DATABASE_URL: str = settings.SQLALCHEMY_DATABASE_URI or DEFAULT_DB


# Create async engine
engine: AsyncEngine = create_async_engine(
	DATABASE_URL,
	echo=settings.DEBUG,
	future=True,
)


# Session factory
async_session = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


# Declarative base for models
Base = declarative_base()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
	"""Yield an async SQLAlchemy session.

	Use this in FastAPI dependencies:
	`async def endpoint(db: AsyncSession = Depends(get_session)):`
	"""
	async with async_session() as session:
		yield session


async def init_db() -> None:
	"""Create DB tables (runs Base.metadata.create_all on the async engine).

	Call this at startup or from a migration task.
	"""
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)


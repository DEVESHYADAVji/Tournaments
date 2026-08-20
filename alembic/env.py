from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.core.database import Base
from app.models import announcement as _announcement_model  # noqa: F401
from app.models import auth_user as _auth_user_model  # noqa: F401
from app.models import match as _match_model  # noqa: F401
from app.models import notification as _notification_model  # noqa: F401
from app.models import password_reset_token as _password_reset_token_model  # noqa: F401
from app.models import payment as _payment_model  # noqa: F401
from app.models import payment_webhook_event as _payment_webhook_event_model  # noqa: F401
from app.models import team as _team_model  # noqa: F401
from app.models import token_revocation as _token_revocation_model  # noqa: F401
from app.models import tournament as _tournament_model  # noqa: F401
from app.models import tournament_registration as _registration_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_DATABASE_URI or "")
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda sync_connection: context.configure(
                connection=sync_connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
        )
        await connection.run_sync(lambda _: _run_migrations())
    await connectable.dispose()


def _run_migrations() -> None:
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

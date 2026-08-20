"""Establish the current application schema and migrate legacy columns.

This migration is intentionally idempotent for existing deployments because the
project previously evolved its schema at application startup.
"""

from alembic import op
from sqlalchemy import Column, DateTime, Index, Integer, String, inspect

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

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def _add_column_if_missing(bind, table_name: str, column: Column) -> None:
    inspector = inspect(bind)
    if table_name not in inspector.get_table_names():
        return
    existing = {item["name"] for item in inspector.get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def _add_index_if_missing(bind, table_name: str, index_name: str, columns: list[str]) -> None:
    inspector = inspect(bind)
    if table_name not in inspector.get_table_names():
        return
    indexes = {item["name"] for item in inspector.get_indexes(table_name)}
    if index_name not in indexes:
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    bind = op.get_bind()

    # Create all missing tables first. Existing tables are preserved so legacy
    # deployments can be upgraded without destructive operations.
    Base.metadata.create_all(bind=bind)

    _add_column_if_missing(bind, "tournaments", Column("format", String(100), nullable=False, server_default="Single Elimination"))
    _add_column_if_missing(bind, "tournaments", Column("location", String(255), nullable=True))
    _add_column_if_missing(bind, "tournaments", Column("start_date", DateTime(), nullable=True))
    _add_column_if_missing(bind, "tournaments", Column("end_date", DateTime(), nullable=True))
    _add_column_if_missing(bind, "tournaments", Column("prize_pool", Integer(), nullable=False, server_default="0"))
    _add_column_if_missing(bind, "tournaments", Column("max_teams", Integer(), nullable=False, server_default="16"))
    _add_column_if_missing(bind, "tournaments", Column("created_by_user_id", Integer(), nullable=True))
    _add_column_if_missing(bind, "tournaments", Column("entry_fee", Integer(), nullable=False, server_default="0"))
    _add_index_if_missing(bind, "tournaments", "ix_tournaments_created_by_user_id", ["created_by_user_id"])

    _add_column_if_missing(bind, "matches", Column("bracket_match_number", Integer(), nullable=True))
    _add_column_if_missing(bind, "matches", Column("next_match_id", Integer(), nullable=True))
    _add_index_if_missing(bind, "matches", "ix_matches_bracket_match_number", ["bracket_match_number"])

    # Newly introduced tables are created by metadata.create_all above,
    # including persistent JWT revocations used by logout.


def downgrade() -> None:
    raise RuntimeError("The baseline migration is intentionally irreversible; use a forward migration for schema changes.")

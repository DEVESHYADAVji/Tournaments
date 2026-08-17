from sqlalchemy import inspect, text

from app.core.database import engine


async def ensure_extended_schema() -> None:
    def upgrade(sync_conn):
        inspector = inspect(sync_conn)
        if inspector.has_table("tournaments"):
            tournament_columns = {column["name"] for column in inspector.get_columns("tournaments")}
            if "entry_fee" not in tournament_columns:
                sync_conn.execute(text("ALTER TABLE tournaments ADD COLUMN entry_fee INTEGER NOT NULL DEFAULT 0"))

        if inspector.has_table("matches"):
            match_columns = {column["name"] for column in inspector.get_columns("matches")}
            if "bracket_match_number" not in match_columns:
                sync_conn.execute(text("ALTER TABLE matches ADD COLUMN bracket_match_number INTEGER NULL"))
            if "next_match_id" not in match_columns:
                sync_conn.execute(text("ALTER TABLE matches ADD COLUMN next_match_id INTEGER NULL"))

    async with engine.begin() as conn:
        await conn.run_sync(upgrade)

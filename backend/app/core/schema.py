from sqlalchemy import inspect, text

from app.core.database import engine


async def ensure_extended_schema() -> None:
    def upgrade(sync_conn):
        inspector = inspect(sync_conn)
        if not inspector.has_table("tournaments"):
            return
        columns = {column["name"] for column in inspector.get_columns("tournaments")}
        if "entry_fee" not in columns:
            sync_conn.execute(text("ALTER TABLE tournaments ADD COLUMN entry_fee INTEGER NOT NULL DEFAULT 0"))

    async with engine.begin() as conn:
        await conn.run_sync(upgrade)

"""Database bootstrap for the Supabase-first backend runtime."""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.env import load_backend_env

load_backend_env()


def _resolve_database_url() -> str:
    """Resolve the runtime database URL with a SQLite fallback for tests."""
    candidates = (
        os.environ.get("SUPABASE_DB_URL", "").strip(),
        os.environ.get("POSTGRES_DATABASE_URL", "").strip(),
        os.environ.get("DATABASE_URL", "").strip(),
    )
    for candidate in candidates:
        if not candidate:
            continue
        if candidate.startswith(("postgresql://", "postgres://", "sqlite://")):
            return candidate

    db_path = os.environ.get("DB_PATH", "./vulncontext.db").strip()
    return f"sqlite:///{db_path}"


def _engine_kwargs(database_url: str) -> dict:
    if database_url.startswith("sqlite:"):
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


SQLALCHEMY_DATABASE_URL = _resolve_database_url()

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    **_engine_kwargs(SQLALCHEMY_DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
def init_db_schema():
    Base.metadata.create_all(bind=engine)
    
def init_asset_tag_schema() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS asset_tag_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            score INTEGER NOT NULL,
            description TEXT NULL,
            is_predefined BOOLEAN NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_asset_tag_definitions_name
            ON asset_tag_definitions (name)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_asset_tag_definitions_score
            ON asset_tag_definitions (score)
        """,
        """
        CREATE TABLE IF NOT EXISTS asset_tag_assignments (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            assigned_by TEXT NULL,
            CONSTRAINT uq_asset_tag_assignments_asset_tag UNIQUE (asset_id, tag_id),
            FOREIGN KEY(asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES asset_tag_definitions(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_asset_tag_assignments_asset_id
            ON asset_tag_assignments (asset_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_asset_tag_assignments_tag_id
            ON asset_tag_assignments (tag_id)
        """,
    ]

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

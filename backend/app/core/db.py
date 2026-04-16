"""Database bootstrap for the Supabase-first backend runtime."""

import os

from sqlalchemy import create_engine
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

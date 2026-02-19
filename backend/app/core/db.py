from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./vulncontext.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def ensure_database_schema() -> None:
    """
    Lightweight compatibility migration for local SQLite development.

    Adds columns that may not exist in older local DB files.
    """
    inspector = inspect(engine)
    if "scored_findings" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("scored_findings")}
    if "source" not in columns:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE scored_findings "
                    "ADD COLUMN source VARCHAR NOT NULL DEFAULT 'unknown'"
                )
            )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

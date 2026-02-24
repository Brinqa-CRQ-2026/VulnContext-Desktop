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


def _add_column_if_missing(table_name: str, column_name: str, ddl_fragment: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    if column_name in columns:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_fragment}"))


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

    scored_finding_additions = {
        "is_kev": "BOOLEAN NOT NULL DEFAULT 0",
        "kev_date_added": "DATETIME",
        "kev_due_date": "DATETIME",
        "sla_hours": "INTEGER",
        "kev_vendor_project": "VARCHAR",
        "kev_product": "VARCHAR",
        "kev_vulnerability_name": "VARCHAR",
        "kev_short_description": "TEXT",
        "kev_required_action": "TEXT",
        "kev_ransomware_use": "VARCHAR",
        "finding_key": "VARCHAR",
        "lifecycle_status": "VARCHAR NOT NULL DEFAULT 'active'",
        "is_present_in_latest_scan": "BOOLEAN NOT NULL DEFAULT 1",
        "first_seen_at": "DATETIME",
        "last_seen_at": "DATETIME",
        "fixed_at": "DATETIME",
        "status_changed_at": "DATETIME",
        "last_scan_run_id": "INTEGER",
        "disposition": "VARCHAR NOT NULL DEFAULT 'none'",
        "disposition_state": "VARCHAR",
        "disposition_reason": "VARCHAR",
        "disposition_comment": "TEXT",
        "disposition_created_at": "DATETIME",
        "disposition_expires_at": "DATETIME",
        "disposition_created_by": "VARCHAR",
    }
    for column_name, ddl_fragment in scored_finding_additions.items():
        _add_column_if_missing("scored_findings", column_name, ddl_fragment)

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_is_kev "
                "ON scored_findings (is_kev)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_finding_key "
                "ON scored_findings (finding_key)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_lifecycle_status "
                "ON scored_findings (lifecycle_status)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_disposition "
                "ON scored_findings (disposition)"
            )
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


def _resolve_database_url() -> str:
    db_path = os.environ.get("DB_PATH", "./vulncontext.db").strip()
    return f"sqlite:///{db_path}"


SQLALCHEMY_DATABASE_URL = _resolve_database_url()

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

    The current canonical finding shape is moving from the original
    Qualys-style scoring schema to the staged Brinqa/Wiz finding schema.
    Old columns are not dropped here; SQLite compatibility is additive.
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
        "uid": "VARCHAR",
        "record_id": "VARCHAR",
        "display_name": "VARCHAR",
        "cve_id": "VARCHAR",
        "cwe_ids": "TEXT",
        "cve_ids": "TEXT",
        "cve_record_names": "TEXT",
        "status": "VARCHAR",
        "status_category": "VARCHAR",
        "source_status": "VARCHAR",
        "compliance_status": "VARCHAR",
        "severity": "VARCHAR",
        "risk_factor_names": "TEXT",
        "risk_factor_values": "TEXT",
        "age_in_days": "FLOAT",
        "first_found": "DATETIME",
        "last_found": "DATETIME",
        "due_date": "DATETIME",
        "cisa_due_date_expired": "BOOLEAN",
        "target_count": "INTEGER",
        "target_ids": "TEXT",
        "target_names": "TEXT",
        "asset_criticality": "INTEGER",
        "context_score": "FLOAT",
        "attack_pattern_names": "TEXT",
        "attack_technique_names": "TEXT",
        "attack_tactic_names": "TEXT",
        "cvss_score": "FLOAT",
        "cvss_vector": "VARCHAR",
        "cvss_version": "VARCHAR",
        "cvss_severity": "VARCHAR",
        "attack_vector": "VARCHAR",
        "attack_complexity": "VARCHAR",
        "epss_score": "FLOAT",
        "epss_percentile": "FLOAT",
        "is_kev": "BOOLEAN NOT NULL DEFAULT 0",
        "kev_date_added": "DATETIME",
        "kev_due_date": "DATETIME",
        "kev_vendor_project": "VARCHAR",
        "kev_product": "VARCHAR",
        "kev_vulnerability_name": "VARCHAR",
        "kev_short_description": "TEXT",
        "kev_required_action": "TEXT",
        "kev_ransomware_use": "VARCHAR",
        "base_risk_score": "FLOAT",
        "risk_rating": "VARCHAR",
        "record_link": "VARCHAR",
        "summary": "TEXT",
        "type_display_name": "VARCHAR",
        "type_id": "VARCHAR",
        "date_created": "DATETIME",
        "last_updated": "DATETIME",
        "sla_days": "FLOAT",
        "sla_level": "VARCHAR",
        "risk_owner_name": "VARCHAR",
        "remediation_owner_name": "VARCHAR",
        "source_count": "INTEGER",
        "source_uids": "TEXT",
        "source_record_uids": "TEXT",
        "source_links": "TEXT",
        "connector_names": "TEXT",
        "source_connector_names": "TEXT",
        "connector_categories": "TEXT",
        "data_integration_titles": "TEXT",
        "informed_user_names": "TEXT",
        "data_model_name": "VARCHAR",
        "created_by": "VARCHAR",
        "updated_by": "VARCHAR",
        "risk_scoring_model_name": "VARCHAR",
        "sla_definition_name": "VARCHAR",
        "confidence": "VARCHAR",
        "risk_factor_offset": "FLOAT",
        "category_count": "INTEGER",
        "categories": "TEXT",
        "internal_risk_score": "FLOAT",
        "internal_risk_band": "VARCHAR",
        "internal_risk_notes": "TEXT",
        "remediation_summary": "TEXT",
        "remediation_plan": "TEXT",
        "remediation_notes": "TEXT",
        "remediation_status": "VARCHAR",
        "remediation_due_date": "DATETIME",
        "remediation_updated_at": "DATETIME",
        "remediation_updated_by": "VARCHAR",
        "risk_band": "VARCHAR",
        "lifecycle_status": "VARCHAR",
        "finding_key": "VARCHAR",
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

    risk_scoring_config_additions = {
        "kev_weight": "FLOAT NOT NULL DEFAULT 0.25",
        "context_weight": "FLOAT NOT NULL DEFAULT 0.05",
    }
    for column_name, ddl_fragment in risk_scoring_config_additions.items():
        _add_column_if_missing("risk_scoring_config", column_name, ddl_fragment)

    nvd_cache_additions = {
        "source_identifier": "VARCHAR",
        "vuln_status": "VARCHAR",
        "published": "DATETIME",
        "last_modified": "DATETIME",
        "description": "TEXT",
        "cwe_ids": "TEXT",
        "reference_urls": "TEXT",
        "cvss_score": "FLOAT",
        "cvss_vector": "VARCHAR",
        "cvss_version": "VARCHAR",
        "cvss_severity": "VARCHAR",
        "attack_vector": "VARCHAR",
        "attack_complexity": "VARCHAR",
        "cisa_exploit_add": "DATETIME",
        "cisa_action_due": "DATETIME",
        "cisa_required_action": "TEXT",
        "cisa_vulnerability_name": "VARCHAR",
        "has_kev": "BOOLEAN NOT NULL DEFAULT 0",
    }
    for column_name, ddl_fragment in nvd_cache_additions.items():
        _add_column_if_missing("nvd_cve_cache", column_name, ddl_fragment)

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_uid "
                "ON scored_findings (uid)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_cve_id "
                "ON scored_findings (cve_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_status_category "
                "ON scored_findings (status_category)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_risk_rating "
                "ON scored_findings (risk_rating)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_due_date "
                "ON scored_findings (due_date)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_internal_risk_score "
                "ON scored_findings (internal_risk_score)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_cvss_score "
                "ON scored_findings (cvss_score)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_epss_score "
                "ON scored_findings (epss_score)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_is_kev "
                "ON scored_findings (is_kev)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_asset_criticality "
                "ON scored_findings (asset_criticality)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_internal_risk_band "
                "ON scored_findings (internal_risk_band)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_remediation_status "
                "ON scored_findings (remediation_status)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_scored_findings_remediation_due_date "
                "ON scored_findings (remediation_due_date)"
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
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_nvd_cve_cache_last_modified "
                "ON nvd_cve_cache (last_modified)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_nvd_cve_cache_cvss_score "
                "ON nvd_cve_cache (cvss_score)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_nvd_cve_cache_has_kev "
                "ON nvd_cve_cache (has_kev)"
            )
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

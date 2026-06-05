import pytest
from sqlalchemy import create_engine, text

from app.services.scoring.crq_finding import (
    _where_clause,
    missing_crq_columns,
    require_crq_columns,
)


def test_finding_scoring_schema_guard_reports_missing_columns():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE findings (id integer primary key, finding_id text)"))

    missing = missing_crq_columns(engine)

    assert "crq_finding_score" in missing
    assert "crq_finding_notes" in missing
    with pytest.raises(RuntimeError, match="CRQ columns are missing"):
        require_crq_columns(engine)
    engine.dispose()


def test_finding_scoring_where_clause_targets_requested_findings_only():
    assert _where_clause(None) == ""
    assert _where_clause([]) == ""
    assert _where_clause(["finding-1"]) == "WHERE f.finding_id IN :finding_ids"

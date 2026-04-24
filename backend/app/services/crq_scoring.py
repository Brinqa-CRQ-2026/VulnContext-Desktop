"""CRQ finding scoring helpers."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import Engine, bindparam, inspect, text
from sqlalchemy.orm import Session

CRQ_VERSION = "v4"

CRQ_COLUMNS: tuple[str, ...] = (
    "crq_score",
    "crq_risk_band",
    "crq_scored_at",
    "crq_score_version",
    "crq_cvss_score",
    "crq_epss_score",
    "crq_epss_percentile",
    "crq_epss_multiplier",
    "crq_is_kev",
    "crq_kev_bonus",
    "crq_age_days",
    "crq_age_bonus",
    "crq_notes",
)


def missing_crq_columns(target_engine: Engine) -> list[str]:
    inspector = inspect(target_engine)
    existing = {column["name"] for column in inspector.get_columns("findings")}
    return [column_name for column_name in CRQ_COLUMNS if column_name not in existing]


def require_crq_columns(target_engine: Engine) -> None:
    missing = missing_crq_columns(target_engine)
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(
            "CRQ columns are missing from public.findings. "
            "Apply the tracked Supabase migration before running the scorer. "
            f"Missing columns: {missing_list}"
        )


def _where_clause(finding_ids: Sequence[str] | None) -> str:
    if not finding_ids:
        return ""
    return "WHERE f.finding_id IN :finding_ids"


def _scoring_cte(where_sql: str) -> str:
    return f"""
WITH base AS (
    SELECT
        f.id,
        f.finding_id,
        COALESCE(n.cvss_score, 0.0) AS crq_cvss_score,
        e.epss AS crq_epss_score,
        e.percentile AS crq_epss_percentile,
        CASE
            WHEN e.percentile IS NULL THEN 0.0
            WHEN COALESCE(n.cvss_score, 0.0) <= 0.0 THEN 0.0
            WHEN COALESCE(n.cvss_score, 0.0) < 4.0 AND e.percentile < 0.20 THEN -0.20
            WHEN COALESCE(n.cvss_score, 0.0) < 4.0 AND e.percentile < 0.50 THEN -0.05
            WHEN e.percentile < 0.20 THEN -0.40
            WHEN e.percentile < 0.50 THEN -0.15
            WHEN e.percentile < 0.80 THEN 0.0
            WHEN e.percentile < 0.95 THEN 0.35
            ELSE 0.75
        END AS crq_epss_multiplier,
        CASE WHEN k.cve IS NOT NULL THEN 1 ELSE 0 END AS crq_is_kev,
        CASE WHEN k.cve IS NOT NULL THEN 0.9 ELSE 0.0 END AS crq_kev_bonus,
        f.age_in_days AS crq_age_days,
        CASE
            WHEN f.age_in_days IS NULL THEN 0.0
            WHEN f.age_in_days <= 30 THEN 0.0
            WHEN f.age_in_days <= 90 THEN 0.25
            WHEN f.age_in_days <= 180 THEN 0.5
            ELSE 1.0
        END AS crq_age_bonus,
        NULLIF(TRIM(
            COALESCE(CASE WHEN n.cvss_score IS NULL THEN 'Missing NVD CVSS; defaulted CRQ CVSS input to 0. ' END, '') ||
            COALESCE(CASE WHEN e.percentile IS NULL THEN 'Missing EPSS percentile; defaulted EPSS adjustment to 0.0. ' END, '') ||
            COALESCE(CASE WHEN n.cvss_score IS NOT NULL AND n.cvss_score < 4.0 AND e.percentile IS NOT NULL AND e.percentile < 0.50 THEN 'Low CVSS finding; softened negative EPSS adjustment. ' END, '') ||
            COALESCE(CASE WHEN f.age_in_days IS NULL THEN 'Missing age_in_days; age reference defaults to 0.0 and is excluded from CRQ v4 scoring. ' END, '')
        ), '') AS crq_notes
    FROM findings f
    LEFT JOIN nvd n ON n.cve = f.cve_id
    LEFT JOIN epss_scores e ON e.cve = f.cve_id
    LEFT JOIN kev k ON k.cve = f.cve_id
    {where_sql}
), scoring AS (
    SELECT
        id,
        finding_id,
        crq_cvss_score,
        crq_epss_score,
        crq_epss_percentile,
        crq_epss_multiplier,
        crq_is_kev,
        crq_kev_bonus,
        crq_age_days,
        crq_age_bonus,
        CASE
            WHEN (
                crq_cvss_score * 0.88 +
                COALESCE(crq_epss_multiplier, 0.0) +
                crq_kev_bonus
            ) > 10.0 THEN 10.0
            ELSE (
                crq_cvss_score * 0.88 +
                COALESCE(crq_epss_multiplier, 0.0) +
                crq_kev_bonus
            )
        END AS crq_score,
        CASE
            WHEN (
                CASE
                    WHEN (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    ) > 10.0 THEN 10.0
                    ELSE (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    )
                END
            ) >= 9.0 THEN 'Critical'
            WHEN (
                CASE
                    WHEN (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    ) > 10.0 THEN 10.0
                    ELSE (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    )
                END
            ) >= 7.0 THEN 'High'
            WHEN (
                CASE
                    WHEN (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    ) > 10.0 THEN 10.0
                    ELSE (
                        crq_cvss_score * 0.88 +
                        COALESCE(crq_epss_multiplier, 0.0) +
                        crq_kev_bonus
                    )
                END
            ) >= 4.0 THEN 'Medium'
            ELSE 'Low'
        END AS crq_risk_band,
        crq_notes
    FROM base
)
"""


def _bind_finding_ids(query_text: str):
    return text(query_text).bindparams(bindparam("finding_ids", expanding=True))


def preview_scores(db: Session, finding_ids: Sequence[str] | None = None) -> list[dict]:
    where_sql = _where_clause(finding_ids)
    query_text = (
        _scoring_cte(where_sql)
        + """
SELECT
    finding_id,
    crq_score,
    crq_risk_band,
    crq_cvss_score,
    crq_epss_score,
    crq_epss_percentile,
    crq_epss_multiplier,
    crq_is_kev,
    crq_kev_bonus,
    crq_age_days,
    crq_age_bonus,
    crq_notes
FROM scoring
ORDER BY id
"""
    )
    query = _bind_finding_ids(query_text) if finding_ids else text(query_text)
    params = {"finding_ids": list(finding_ids)} if finding_ids else {}
    return [dict(row._mapping) for row in db.execute(query, params)]


def score_findings(
    db: Session,
    *,
    scored_at: datetime | None = None,
    finding_ids: Sequence[str] | None = None,
) -> int:
    timestamp = scored_at or datetime.now(timezone.utc)
    where_sql = _where_clause(finding_ids)
    query_text = (
        _scoring_cte(where_sql)
        + """
UPDATE findings AS f
SET
    crq_score = scoring.crq_score,
    crq_risk_band = scoring.crq_risk_band,
    crq_scored_at = :scored_at,
    crq_score_version = :crq_score_version,
    crq_cvss_score = scoring.crq_cvss_score,
    crq_epss_score = scoring.crq_epss_score,
    crq_epss_percentile = scoring.crq_epss_percentile,
    crq_epss_multiplier = scoring.crq_epss_multiplier,
    crq_is_kev = scoring.crq_is_kev,
    crq_kev_bonus = scoring.crq_kev_bonus,
    crq_age_days = scoring.crq_age_days,
    crq_age_bonus = scoring.crq_age_bonus,
    crq_notes = scoring.crq_notes
FROM scoring
WHERE f.id = scoring.id
"""
    )
    query = _bind_finding_ids(query_text) if finding_ids else text(query_text)
    params = {
        "scored_at": timestamp,
        "crq_score_version": CRQ_VERSION,
    }
    if finding_ids:
        params["finding_ids"] = list(finding_ids)
    result = db.execute(query, params)
    db.commit()
    if result.rowcount is not None and result.rowcount >= 0:
        return result.rowcount

    count_sql = "SELECT COUNT(*) FROM findings"
    count_params: dict[str, object] = {}
    if finding_ids:
        count_sql += " WHERE finding_id IN :finding_ids"
        count_query = text(count_sql).bindparams(bindparam("finding_ids", expanding=True))
        count_params["finding_ids"] = list(finding_ids)
    else:
        count_query = text(count_sql)
    return int(db.execute(count_query, count_params).scalar_one())

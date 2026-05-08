"""Application-level CRQ scoring helpers.

Application compliance and rollup/final risk scores are product-facing 0-10
values. Compliance is converted from tag-derived 0-1-style truth inputs into a
0-10 score before it adjusts final application risk.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Engine, bindparam, inspect, text
from sqlalchemy.orm import Session

APPLICATION_SCORING_VERSION = "v1"

APPLICATION_SCORING_COLUMNS: tuple[str, ...] = (
    "crq_application_aggregated_asset_risk",
    "crq_application_compliance_score",
    "crq_application_risk_score",
    "crq_application_asset_count",
    "crq_application_finding_count",
    "crq_application_scored_at",
)


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _round_score(value: float) -> float:
    return round(value, 2)


def _where_clause(application_ids: Sequence[str] | None) -> str:
    if not application_ids:
        return ""
    return "WHERE app.id IN :application_ids"


def _bind_application_ids(query_text: str):
    return text(query_text).bindparams(bindparam("application_ids", expanding=True))


def missing_application_scoring_columns(target_engine: Engine) -> list[str]:
    inspector = inspect(target_engine)
    existing = {column["name"] for column in inspector.get_columns("applications")}
    return [
        column_name
        for column_name in APPLICATION_SCORING_COLUMNS
        if column_name not in existing
    ]


def require_application_scoring_columns(target_engine: Engine) -> None:
    missing = missing_application_scoring_columns(target_engine)
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(
            "Application scoring columns are missing from public.applications. "
            "Apply the tracked Supabase migration before running the application scorer. "
            f"Missing columns: {missing_list}"
        )


def calculate_aggregated_asset_risk(asset_scores: Sequence[float | None] | None) -> float:
    """Aggregate 0-10 asset risk scores into a 0-10 application risk signal."""
    if not asset_scores:
        return 0.0

    normalized_scores = [
        _clamp(score, minimum=0.0, maximum=10.0)
        for score in asset_scores
        if score is not None
    ]
    if not normalized_scores:
        return 0.0

    sorted_scores = sorted(normalized_scores, reverse=True)
    max_score = sorted_scores[0]

    k = min(5, len(sorted_scores))
    top_k_avg = sum(sorted_scores[:k]) / k

    total_score = sum(sorted_scores)
    scored_asset_count = len(sorted_scores)
    log_scaled_component = (
        math.log(1 + total_score) / math.log(1 + (scored_asset_count * 10))
    ) * 10

    aggregated = (
        (0.5 * max_score)
        + (0.3 * top_k_avg)
        + (0.2 * log_scaled_component)
    )
    return _round_score(_clamp(aggregated, minimum=0.0, maximum=10.0))


def _normalize_tag(tag: Any) -> str:
    return str(tag).strip().lower()


def calculate_application_compliance_score(tags: Sequence[Any] | str | None) -> float:
    """Calculate 0-10 application compliance score from PCI/PII tags only."""
    if tags is None:
        return 4.0

    if isinstance(tags, str):
        try:
            parsed_tags = json.loads(tags)
        except json.JSONDecodeError:
            parsed_tags = None
        if isinstance(parsed_tags, list):
            normalized_tags = {
                _normalize_tag(tag) for tag in parsed_tags if str(tag).strip()
            }
        else:
            normalized_tags = {
                part.strip().lower()
                for part in tags.replace(";", ",").split(",")
                if part.strip()
            }
    else:
        normalized_tags = {_normalize_tag(tag) for tag in tags if str(tag).strip()}

    has_pci = "pci" in normalized_tags
    has_pii = "pii" in normalized_tags

    if has_pci and has_pii:
        return 10.0
    if has_pci or has_pii:
        return 8.0
    return 2.0


def calculate_application_risk_score(
    aggregated_asset_risk: float,
    compliance_score: float,
) -> float:
    """Calculate final 0-10 application risk from asset risk and compliance."""
    if aggregated_asset_risk <= 0.0:
        return 0.0

    compliance_multiplier = 0.7 + (0.3 * compliance_score / 10)
    final_score = aggregated_asset_risk * compliance_multiplier
    return _round_score(_clamp(final_score, minimum=0.0, maximum=10.0))


def _scoring_query(where_sql: str) -> str:
    return f"""
WITH asset_inputs AS (
    SELECT
        app.id AS application_id,
        COUNT(a.asset_id) AS asset_count,
        COALESCE(
            MAX(a.crq_asset_risk_score) FILTER (WHERE a.crq_asset_risk_score IS NOT NULL),
            0.0
        ) AS max_score,
        COALESCE(
            SUM(a.crq_asset_risk_score) FILTER (WHERE a.crq_asset_risk_score IS NOT NULL),
            0.0
        ) AS total_score,
        COUNT(a.crq_asset_risk_score) FILTER (WHERE a.crq_asset_risk_score IS NOT NULL) AS scored_asset_count
    FROM applications app
    LEFT JOIN assets a ON a.application_id = app.id
    {where_sql}
    GROUP BY app.id
), finding_inputs AS (
    SELECT
        app.id AS application_id,
        COUNT(f.id) AS finding_count
    FROM applications app
    LEFT JOIN assets a ON a.application_id = app.id
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    {where_sql}
    GROUP BY app.id
), ranked_scores AS (
    SELECT
        app.id AS application_id,
        a.crq_asset_risk_score,
        ROW_NUMBER() OVER (
            PARTITION BY app.id
            ORDER BY a.crq_asset_risk_score DESC, a.asset_id DESC
        ) AS rank_index
    FROM applications app
    LEFT JOIN assets a ON a.application_id = app.id
    {where_sql}
), top_k AS (
    SELECT
        application_id,
        AVG(crq_asset_risk_score) AS top_k_avg
    FROM ranked_scores
    WHERE crq_asset_risk_score IS NOT NULL
      AND rank_index <= 5
    GROUP BY application_id
)
SELECT
    app.id AS application_id,
    app.tags,
    ai.asset_count,
    fi.finding_count,
    ai.max_score,
    COALESCE(tk.top_k_avg, 0.0) AS top_k_avg,
    ai.total_score,
    ai.scored_asset_count
FROM applications app
LEFT JOIN asset_inputs ai ON ai.application_id = app.id
LEFT JOIN finding_inputs fi ON fi.application_id = app.id
LEFT JOIN top_k tk ON tk.application_id = app.id
{where_sql}
ORDER BY app.id
"""


def _computed_application_scores(
    db: Session,
    application_ids: Sequence[str] | None = None,
) -> list[dict[str, Any]]:
    where_sql = _where_clause(application_ids)
    query_text = _scoring_query(where_sql)
    query = _bind_application_ids(query_text) if application_ids else text(query_text)
    params = {"application_ids": list(application_ids)} if application_ids else {}
    rows = [dict(row._mapping) for row in db.execute(query, params)]

    computed_rows: list[dict[str, Any]] = []
    for row in rows:
        scored_asset_count = int(row["scored_asset_count"] or 0)
        top_k_avg = float(row["top_k_avg"] or 0.0)
        max_score = float(row["max_score"] or 0.0)
        total_score = float(row["total_score"] or 0.0)

        if scored_asset_count <= 0:
            aggregated_asset_risk = 0.0
        else:
            log_scaled_component = (
                math.log(1 + total_score) / math.log(1 + (scored_asset_count * 10))
            ) * 10
            aggregated_asset_risk = _round_score(
                _clamp(
                    (0.5 * max_score)
                    + (0.3 * top_k_avg)
                    + (0.2 * log_scaled_component),
                    minimum=0.0,
                    maximum=10.0,
                )
            )

        compliance_score = calculate_application_compliance_score(row["tags"])
        application_risk_score = calculate_application_risk_score(
            aggregated_asset_risk,
            compliance_score,
        )

        computed_rows.append(
            {
                "application_id": row["application_id"],
                "crq_application_aggregated_asset_risk": aggregated_asset_risk,
                "crq_application_compliance_score": compliance_score,
                "crq_application_risk_score": application_risk_score,
                "crq_application_asset_count": int(row["asset_count"] or 0),
                "crq_application_finding_count": int(row["finding_count"] or 0),
            }
        )

    return computed_rows


def score_applications(
    db: Session,
    *,
    scored_at: datetime | None = None,
    application_ids: Sequence[str] | None = None,
) -> int:
    timestamp = scored_at or datetime.now(timezone.utc)
    computed_rows = _computed_application_scores(db, application_ids=application_ids)
    if not computed_rows:
        return 0

    update_stmt = text(
        """
UPDATE applications
SET
    crq_application_aggregated_asset_risk = :crq_application_aggregated_asset_risk,
    crq_application_compliance_score = :crq_application_compliance_score,
    crq_application_risk_score = :crq_application_risk_score,
    crq_application_asset_count = :crq_application_asset_count,
    crq_application_finding_count = :crq_application_finding_count,
    crq_application_scored_at = :scored_at
WHERE id = :application_id
"""
    )

    params = [
        {
            **row,
            "scored_at": timestamp,
        }
        for row in computed_rows
    ]
    result = db.execute(update_stmt, params)
    db.commit()
    if result.rowcount is not None and result.rowcount >= 0:
        return result.rowcount
    return len(params)

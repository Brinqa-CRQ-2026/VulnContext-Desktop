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

APPLICATION_SCORING_VERSION = "v4"

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


def calculate_aggregated_asset_risk(
    asset_scores: Sequence[float | None] | None,
    asset_finding_counts: Sequence[int | None] | None = None,
) -> float:
    """Aggregate 0-10 asset risk scores into a 0-10 application risk signal."""
    if not asset_scores:
        return 0.0

    normalized_assets: list[tuple[float, int]] = []
    counts = asset_finding_counts or []
    for index, score in enumerate(asset_scores):
        if score is None:
            continue
        finding_count = counts[index] if index < len(counts) and counts[index] else 0
        normalized_assets.append(
            (_clamp(score, minimum=0.0, maximum=10.0), max(0, int(finding_count)))
        )

    if not normalized_assets:
        return 0.0

    asset_count = len(normalized_assets)
    total_asset_risk = sum(score for score, _ in normalized_assets)
    weighted_total = 0.0
    weight_total = 0.0
    for score, finding_count in normalized_assets:
        weight = math.log(1 + finding_count)
        weighted_total += score * weight
        weight_total += weight

    if weight_total <= 0.0:
        return 0.0

    weighted_asset_average = weighted_total / weight_total
    max_asset_risk = max(score for score, _ in normalized_assets)
    asset_burden_score = (
        math.log(1 + total_asset_risk) / math.log(1 + (asset_count * 10))
    ) * 10
    aggregated = (
        (0.50 * weighted_asset_average)
        + (0.30 * max_asset_risk)
        + (0.20 * asset_burden_score)
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
WITH target_applications AS (
    SELECT app.id, app.tags
    FROM applications app
    {where_sql}
), asset_rows AS (
    SELECT
        app.id AS application_id,
        app.tags,
        a.asset_id,
        a.crq_asset_risk_score,
        COALESCE(a.crq_asset_finding_count, COUNT(f.id), 0) AS asset_finding_count
    FROM target_applications app
    LEFT JOIN assets a ON a.application_id = app.id
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    GROUP BY app.id, app.tags, a.asset_id, a.crq_asset_risk_score, a.crq_asset_finding_count
), application_counts AS (
    SELECT
        application_id,
        COUNT(asset_id) AS asset_count,
        COALESCE(SUM(asset_finding_count), 0) AS finding_count
    FROM asset_rows
    GROUP BY application_id
)
SELECT
    ar.application_id,
    ar.tags,
    ar.asset_id,
    ar.crq_asset_risk_score,
    ar.asset_finding_count,
    ac.asset_count,
    ac.finding_count
FROM asset_rows ar
LEFT JOIN application_counts ac ON ac.application_id = ar.application_id
ORDER BY ar.application_id, ar.asset_id
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
    grouped_rows: dict[str, dict[str, Any]] = {}
    for row in rows:
        application_id = row["application_id"]
        grouped_row = grouped_rows.setdefault(
            application_id,
            {
                "application_id": application_id,
                "tags": row["tags"],
                "asset_count": int(row["asset_count"] or 0),
                "finding_count": int(row["finding_count"] or 0),
                "asset_scores": [],
                "asset_finding_counts": [],
            },
        )
        if row["asset_id"] is None:
            continue
        grouped_row["asset_scores"].append(row["crq_asset_risk_score"])
        grouped_row["asset_finding_counts"].append(int(row["asset_finding_count"] or 0))

    computed_rows: list[dict[str, Any]] = []
    for row in grouped_rows.values():
        aggregated_asset_risk = calculate_aggregated_asset_risk(
            row["asset_scores"],
            row["asset_finding_counts"],
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

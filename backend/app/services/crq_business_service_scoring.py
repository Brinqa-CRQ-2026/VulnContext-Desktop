"""Business-service CRQ scoring helpers.

Business-service scoring rolls up persisted application and asset final risk
scores. It intentionally does not recompute lower-layer finding, asset context,
or application compliance scoring.
"""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Engine, bindparam, inspect, text
from sqlalchemy.orm import Session

BUSINESS_SERVICE_SCORING_VERSION = "v4"

BUSINESS_SERVICE_SCORING_COLUMNS: tuple[str, ...] = (
    "business_criticality_score",
    "crq_business_service_aggregated_application_risk",
    "crq_business_service_aggregated_direct_asset_risk",
    "crq_business_service_risk_score",
    "crq_business_service_priority_score",
    "crq_business_service_application_count",
    "crq_business_service_asset_count",
    "crq_business_service_finding_count",
    "crq_business_service_scored_at",
)

BUSINESS_UNIT_SCORING_COLUMNS: tuple[str, ...] = (
    "crq_business_unit_risk_score",
    "crq_business_unit_priority_score",
)


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _round_score(value: float) -> float:
    return round(value, 2)


def _where_clause(business_service_ids: Sequence[str] | None) -> str:
    if not business_service_ids:
        return ""
    return "WHERE bs.id IN :business_service_ids"


def _bind_business_service_ids(query_text: str):
    return text(query_text).bindparams(
        bindparam("business_service_ids", expanding=True)
    )


def parse_business_criticality_score(label: str | None) -> int | None:
    if not label:
        return None

    match = re.match(r"^\s*(\d+)\s*[-:]\s*.+?\s*$", label)
    if not match:
        return None

    score = int(match.group(1))
    if score < 0 or score > 5:
        return None
    return score


def calculate_business_service_priority_score(
    business_service_risk_score: float | None,
    business_criticality_score: int | None,
) -> float:
    risk_score = _clamp(business_service_risk_score or 0.0, minimum=0.0, maximum=10.0)
    if business_criticality_score is None:
        return _round_score(risk_score)

    normalized_business_criticality = (
        _clamp(business_criticality_score, minimum=0.0, maximum=5.0) / 5.0
    ) * 10.0
    priority_score = (0.70 * risk_score) + (0.30 * normalized_business_criticality)
    return _round_score(_clamp(priority_score, minimum=0.0, maximum=10.0))


def missing_business_service_scoring_columns(target_engine: Engine) -> list[str]:
    inspector = inspect(target_engine)
    existing = {column["name"] for column in inspector.get_columns("business_services")}
    return [
        column_name
        for column_name in BUSINESS_SERVICE_SCORING_COLUMNS
        if column_name not in existing
    ]


def missing_business_unit_scoring_columns(target_engine: Engine) -> list[str]:
    inspector = inspect(target_engine)
    existing = {column["name"] for column in inspector.get_columns("business_units")}
    return [
        column_name
        for column_name in BUSINESS_UNIT_SCORING_COLUMNS
        if column_name not in existing
    ]


def require_business_service_scoring_columns(target_engine: Engine) -> None:
    missing = missing_business_service_scoring_columns(target_engine)
    missing_unit = missing_business_unit_scoring_columns(target_engine)
    if missing or missing_unit:
        missing_list = ", ".join(missing + missing_unit)
        raise RuntimeError(
            "Business service or business unit scoring columns are missing. "
            "Apply the tracked Supabase migrations before running the business service scorer. "
            f"Missing columns: {missing_list}"
        )


def calculate_aggregated_child_risk(child_scores: Sequence[float | None] | None) -> float:
    """Aggregate 0-10 child risk scores into a 0-10 business-service signal."""
    if not child_scores:
        return 0.0

    normalized_scores = [
        _clamp(score, minimum=0.0, maximum=10.0)
        for score in child_scores
        if score is not None
    ]
    if not normalized_scores:
        return 0.0

    return _round_score(sum(normalized_scores) / len(normalized_scores))


def calculate_aggregated_application_risk(
    application_scores: Sequence[float | None] | None,
    application_asset_counts: Sequence[int | None] | None = None,
    application_finding_counts: Sequence[int | None] | None = None,
) -> float:
    if not application_scores:
        return 0.0

    asset_counts = application_asset_counts or []
    finding_counts = application_finding_counts or []
    weighted_total = 0.0
    weight_total = 0.0
    for index, score in enumerate(application_scores):
        if score is None:
            continue
        asset_count = asset_counts[index] if index < len(asset_counts) and asset_counts[index] else 0
        finding_count = (
            finding_counts[index]
            if index < len(finding_counts) and finding_counts[index]
            else 0
        )
        weight = math.log(1 + max(0, int(asset_count))) + math.log(
            1 + max(0, int(finding_count))
        )
        weighted_total += _clamp(score, minimum=0.0, maximum=10.0) * weight
        weight_total += weight

    if weight_total <= 0.0:
        return 0.0
    return _round_score(_clamp(weighted_total / weight_total, minimum=0.0, maximum=10.0))


def calculate_aggregated_direct_asset_risk(
    direct_asset_scores: Sequence[float | None] | None,
    direct_asset_finding_counts: Sequence[int | None] | None = None,
) -> float:
    if not direct_asset_scores:
        return 0.0

    finding_counts = direct_asset_finding_counts or []
    weighted_total = 0.0
    weight_total = 0.0
    for index, score in enumerate(direct_asset_scores):
        if score is None:
            continue
        finding_count = (
            finding_counts[index]
            if index < len(finding_counts) and finding_counts[index]
            else 0
        )
        weight = math.log(1 + max(0, int(finding_count)))
        weighted_total += _clamp(score, minimum=0.0, maximum=10.0) * weight
        weight_total += weight

    if weight_total <= 0.0:
        return 0.0
    return _round_score(_clamp(weighted_total / weight_total, minimum=0.0, maximum=10.0))


def calculate_business_service_risk_score(
    aggregated_application_risk: float,
    aggregated_direct_asset_risk: float,
    *,
    scored_application_count: int,
    scored_direct_asset_count: int,
) -> float:
    has_application_risk = scored_application_count > 0
    has_direct_asset_risk = scored_direct_asset_count > 0

    if not has_application_risk and not has_direct_asset_risk:
        return 0.0

    if has_application_risk and not has_direct_asset_risk:
        final_score = aggregated_application_risk
    elif has_direct_asset_risk and not has_application_risk:
        final_score = aggregated_direct_asset_risk
    else:
        final_score = (
            (0.8 * aggregated_application_risk)
            + (0.2 * aggregated_direct_asset_risk)
        )

    return _round_score(_clamp(final_score, minimum=0.0, maximum=10.0))


def _scoring_query(where_sql: str) -> str:
    return f"""
WITH target_services AS (
    SELECT bs.id
    FROM business_services bs
    {where_sql}
), application_inputs AS (
    SELECT
        ts.id AS business_service_id,
        COUNT(app.id) AS application_count,
        COUNT(app.crq_application_risk_score) FILTER (
            WHERE app.crq_application_risk_score IS NOT NULL
        ) AS scored_application_count
    FROM target_services ts
    LEFT JOIN applications app ON app.business_service_id = ts.id
    GROUP BY ts.id
), application_rows AS (
    SELECT
        ts.id AS business_service_id,
        app.id AS application_id,
        app.crq_application_risk_score,
        app.crq_application_asset_count,
        app.crq_application_finding_count
    FROM target_services ts
    LEFT JOIN applications app ON app.business_service_id = ts.id
), direct_asset_inputs AS (
    SELECT
        ts.id AS business_service_id,
        COUNT(a.crq_asset_risk_score) FILTER (
            WHERE a.crq_asset_risk_score IS NOT NULL
        ) AS scored_direct_asset_count
    FROM target_services ts
    LEFT JOIN assets a
        ON a.business_service_id = ts.id
       AND a.application_id IS NULL
    GROUP BY ts.id
), direct_asset_rows AS (
    SELECT
        ts.id AS business_service_id,
        a.asset_id,
        a.crq_asset_risk_score,
        COUNT(f.id) AS direct_asset_finding_count
    FROM target_services ts
    LEFT JOIN assets a
        ON a.business_service_id = ts.id
       AND a.application_id IS NULL
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    GROUP BY ts.id, a.asset_id, a.crq_asset_risk_score
), service_asset_ids AS (
    SELECT ts.id AS business_service_id, a.asset_id
    FROM target_services ts
    JOIN assets a ON a.business_service_id = ts.id
    UNION
    SELECT ts.id AS business_service_id, a.asset_id
    FROM target_services ts
    JOIN applications app ON app.business_service_id = ts.id
    JOIN assets a ON a.application_id = app.id
), asset_counts AS (
    SELECT business_service_id, COUNT(asset_id) AS asset_count
    FROM service_asset_ids
    GROUP BY business_service_id
), finding_counts AS (
    SELECT sai.business_service_id, COUNT(f.id) AS finding_count
    FROM service_asset_ids sai
    JOIN findings f ON f.asset_id = sai.asset_id
    GROUP BY sai.business_service_id
)
SELECT
    ts.id AS business_service_id,
    bs.criticality_label,
    ai.application_count,
    ai.scored_application_count,
    dai.scored_direct_asset_count,
    COALESCE(ac.asset_count, 0) AS asset_count,
    COALESCE(fc.finding_count, 0) AS finding_count,
    ar.application_id,
    ar.crq_application_risk_score,
    ar.crq_application_asset_count,
    ar.crq_application_finding_count,
    dar.asset_id AS direct_asset_id,
    dar.crq_asset_risk_score AS direct_asset_risk_score,
    dar.direct_asset_finding_count
FROM target_services ts
JOIN business_services bs ON bs.id = ts.id
LEFT JOIN application_inputs ai ON ai.business_service_id = ts.id
LEFT JOIN application_rows ar ON ar.business_service_id = ts.id
LEFT JOIN direct_asset_inputs dai ON dai.business_service_id = ts.id
LEFT JOIN direct_asset_rows dar ON dar.business_service_id = ts.id
LEFT JOIN asset_counts ac ON ac.business_service_id = ts.id
LEFT JOIN finding_counts fc ON fc.business_service_id = ts.id
ORDER BY ts.id, ar.application_id, dar.asset_id
"""


def _computed_business_service_scores(
    db: Session,
    business_service_ids: Sequence[str] | None = None,
) -> list[dict[str, Any]]:
    where_sql = _where_clause(business_service_ids)
    query_text = _scoring_query(where_sql)
    query = (
        _bind_business_service_ids(query_text)
        if business_service_ids
        else text(query_text)
    )
    params = (
        {"business_service_ids": list(business_service_ids)}
        if business_service_ids
        else {}
    )
    rows = [dict(row._mapping) for row in db.execute(query, params)]
    grouped_rows: dict[str, dict[str, Any]] = {}
    for row in rows:
        business_service_id = row["business_service_id"]
        grouped_row = grouped_rows.setdefault(
            business_service_id,
            {
                "business_service_id": business_service_id,
                "criticality_label": row["criticality_label"],
                "application_count": int(row["application_count"] or 0),
                "asset_count": int(row["asset_count"] or 0),
                "finding_count": int(row["finding_count"] or 0),
                "scored_application_count": int(row["scored_application_count"] or 0),
                "scored_direct_asset_count": int(row["scored_direct_asset_count"] or 0),
                "applications": {},
                "direct_assets": {},
            },
        )
        if row["application_id"] is not None:
            grouped_row["applications"][row["application_id"]] = {
                "risk_score": row["crq_application_risk_score"],
                "asset_count": int(row["crq_application_asset_count"] or 0),
                "finding_count": int(row["crq_application_finding_count"] or 0),
            }
        if row["direct_asset_id"] is not None:
            grouped_row["direct_assets"][row["direct_asset_id"]] = {
                "risk_score": row["direct_asset_risk_score"],
                "finding_count": int(row["direct_asset_finding_count"] or 0),
            }

    computed_rows: list[dict[str, Any]] = []
    for row in grouped_rows.values():
        scored_application_count = int(row["scored_application_count"] or 0)
        scored_direct_asset_count = int(row["scored_direct_asset_count"] or 0)
        application_rows = list(row["applications"].values())
        direct_asset_rows = list(row["direct_assets"].values())

        aggregated_application_risk = calculate_aggregated_application_risk(
            [application["risk_score"] for application in application_rows],
            [application["asset_count"] for application in application_rows],
            [application["finding_count"] for application in application_rows],
        )
        aggregated_direct_asset_risk = calculate_aggregated_direct_asset_risk(
            [asset["risk_score"] for asset in direct_asset_rows],
            [asset["finding_count"] for asset in direct_asset_rows],
        )
        business_service_risk_score = calculate_business_service_risk_score(
            aggregated_application_risk,
            aggregated_direct_asset_risk,
            scored_application_count=scored_application_count,
            scored_direct_asset_count=scored_direct_asset_count,
        )
        business_criticality_score = parse_business_criticality_score(
            row["criticality_label"]
        )
        business_service_priority_score = calculate_business_service_priority_score(
            business_service_risk_score,
            business_criticality_score,
        )

        computed_rows.append(
            {
                "business_service_id": row["business_service_id"],
                "business_criticality_score": business_criticality_score,
                "crq_business_service_aggregated_application_risk": aggregated_application_risk,
                "crq_business_service_aggregated_direct_asset_risk": aggregated_direct_asset_risk,
                "crq_business_service_risk_score": business_service_risk_score,
                "crq_business_service_priority_score": business_service_priority_score,
                "crq_business_service_application_count": int(row["application_count"] or 0),
                "crq_business_service_asset_count": int(row["asset_count"] or 0),
                "crq_business_service_finding_count": int(row["finding_count"] or 0),
            }
        )

    return computed_rows


def score_business_services(
    db: Session,
    *,
    scored_at: datetime | None = None,
    business_service_ids: Sequence[str] | None = None,
) -> int:
    timestamp = scored_at or datetime.now(timezone.utc)
    computed_rows = _computed_business_service_scores(
        db,
        business_service_ids=business_service_ids,
    )
    if not computed_rows:
        return 0

    update_stmt = text(
        """
UPDATE business_services
SET
    business_criticality_score = :business_criticality_score,
    crq_business_service_aggregated_application_risk = :crq_business_service_aggregated_application_risk,
    crq_business_service_aggregated_direct_asset_risk = :crq_business_service_aggregated_direct_asset_risk,
    crq_business_service_risk_score = :crq_business_service_risk_score,
    crq_business_service_priority_score = :crq_business_service_priority_score,
    crq_business_service_application_count = :crq_business_service_application_count,
    crq_business_service_asset_count = :crq_business_service_asset_count,
    crq_business_service_finding_count = :crq_business_service_finding_count,
    crq_business_service_scored_at = :scored_at
WHERE id = :business_service_id
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


def _business_unit_ids_for_services(
    db: Session,
    business_service_ids: Sequence[str] | None,
) -> list[str] | None:
    if not business_service_ids:
        return None

    query = text(
        """
SELECT DISTINCT business_unit_id
FROM business_services
WHERE id IN :business_service_ids
  AND business_unit_id IS NOT NULL
"""
    ).bindparams(bindparam("business_service_ids", expanding=True))
    return [
        row._mapping["business_unit_id"]
        for row in db.execute(query, {"business_service_ids": list(business_service_ids)})
    ]


def score_business_unit_rollups(
    db: Session,
    *,
    business_unit_ids: Sequence[str] | None = None,
) -> int:
    if business_unit_ids is not None and not business_unit_ids:
        return 0

    where_sql = "WHERE bu.id IN :business_unit_ids" if business_unit_ids else ""
    query_text = f"""
WITH target_units AS (
    SELECT bu.id
    FROM business_units bu
    {where_sql}
), rollups AS (
    SELECT
        tu.id AS business_unit_id,
        COALESCE(ROUND(AVG(bs.crq_business_service_risk_score), 2), 0.0) AS risk_score,
        COALESCE(ROUND(AVG(bs.crq_business_service_priority_score), 2), 0.0) AS priority_score
    FROM target_units tu
    LEFT JOIN business_services bs ON bs.business_unit_id = tu.id
    GROUP BY tu.id
)
UPDATE business_units
SET
    crq_business_unit_risk_score = rollups.risk_score,
    crq_business_unit_priority_score = rollups.priority_score
FROM rollups
WHERE business_units.id = rollups.business_unit_id
"""
    query = (
        text(query_text).bindparams(bindparam("business_unit_ids", expanding=True))
        if business_unit_ids
        else text(query_text)
    )
    params = {"business_unit_ids": list(business_unit_ids)} if business_unit_ids else {}
    result = db.execute(query, params)
    db.commit()
    if result.rowcount is not None and result.rowcount >= 0:
        return result.rowcount
    return len(business_unit_ids or [])


def score_business_services_and_business_units(
    db: Session,
    *,
    scored_at: datetime | None = None,
    business_service_ids: Sequence[str] | None = None,
) -> tuple[int, int]:
    business_unit_ids = _business_unit_ids_for_services(db, business_service_ids)
    updated_services = score_business_services(
        db,
        scored_at=scored_at,
        business_service_ids=business_service_ids,
    )
    updated_units = score_business_unit_rollups(
        db,
        business_unit_ids=business_unit_ids,
    )
    return updated_services, updated_units

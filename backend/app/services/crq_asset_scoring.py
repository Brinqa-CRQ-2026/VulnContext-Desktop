"""Asset-level contextual scoring helpers."""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import Engine, bindparam, inspect, text
from sqlalchemy.orm import Session

ASSET_SCORING_VERSION = "v1"

ASSET_SCORING_COLUMNS: tuple[str, ...] = (
    "crq_asset_aggregated_finding_risk",
    "crq_asset_exposure_score",
    "crq_asset_data_sensitivity_score",
    "crq_asset_environment_score",
    "crq_asset_type_score",
    "crq_asset_context_score",
    "crq_asset_risk_score",
    "crq_asset_scored_at",
)

EXPOSURE_WEIGHT = 0.35
DATA_SENSITIVITY_WEIGHT = 0.30
ENVIRONMENT_WEIGHT = 0.20
ASSET_TYPE_WEIGHT = 0.15


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _round_score(value: float) -> float:
    return round(value, 2)


def _where_clause(asset_ids: Sequence[str] | None) -> str:
    if not asset_ids:
        return ""
    return "WHERE a.asset_id IN :asset_ids"


def _bind_asset_ids(query_text: str):
    return text(query_text).bindparams(bindparam("asset_ids", expanding=True))


def missing_asset_scoring_columns(target_engine: Engine) -> list[str]:
    inspector = inspect(target_engine)
    existing = {column["name"] for column in inspector.get_columns("assets")}
    return [column_name for column_name in ASSET_SCORING_COLUMNS if column_name not in existing]


def require_asset_scoring_columns(target_engine: Engine) -> None:
    missing = missing_asset_scoring_columns(target_engine)
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(
            "Asset scoring columns are missing from public.assets. "
            "Apply the tracked Supabase migration before running the asset scorer. "
            f"Missing columns: {missing_list}"
        )


def calculate_aggregated_finding_risk(finding_scores: Sequence[float] | None) -> float:
    """Aggregate finding scores while emphasizing high-risk clusters over raw volume."""
    if not finding_scores:
        return 0.0

    # Normalize incoming finding scores into the expected 0-10 range.
    normalized_scores = [
        _clamp(score, minimum=0.0, maximum=10.0)
        for score in finding_scores
        if score is not None
    ]
    if not normalized_scores:
        return 0.0

    sorted_scores = sorted(normalized_scores, reverse=True)
    max_score = sorted_scores[0]

    k = min(5, len(sorted_scores))
    top_k_avg = sum(sorted_scores[:k]) / k

    total_score = sum(sorted_scores)
    n = len(sorted_scores)
    log_scaled_component = (math.log(1 + total_score) / math.log(1 + (n * 10))) * 10

    aggregated = (0.5 * max_score) + (0.3 * top_k_avg) + (0.2 * log_scaled_component)
    return _round_score(_clamp(aggregated, minimum=0.0, maximum=10.0))


def derive_environment(tags: list[str] | None) -> str:
    """Derive an environment from canonical tags when needed by import code."""
    for tag in tags or []:
        if tag == "Production":
            return "production"
        if tag == "Test":
            return "test"
        if tag == "Development":
            return "development"
    return "unknown"


def calculate_exposure_score(
    internal_or_external: str | None,
    public_ip_addresses: str | None,
) -> float:
    """Expected input: DB-native strings such as Internal/External and optional IP text."""
    if public_ip_addresses:
        return 1.0

    if internal_or_external == "External":
        return 1.0
    if internal_or_external == "Internal":
        return 0.6
    return 0.8


def calculate_data_sensitivity_score(
    pci: bool | None,
    pii: bool | None,
    compliance_flags: str | None,
) -> float:
    """Expected input: DB-native booleans plus optional compliance flag text."""
    if pci and pii:
        return 1.0
    if pci or pii:
        return 0.8
    if compliance_flags:
        return 0.6
    return 0.2


def calculate_environment_score(environment: str | None) -> float:
    """Expected input: one of development/production/test/unknown from assets.environment."""
    if environment == "production":
        return 1.0
    if environment == "test":
        return 0.7
    if environment == "development":
        return 0.4
    return 0.6


def calculate_asset_type_score(device_type: str | None, category: str | None) -> float:
    """Expected input: canonical device_type/category values from the asset import pipeline."""
    if device_type in {"Network", "Router", "Firewall"}:
        return 1.0
    if device_type == "Database" or category == "Database":
        return 0.9
    if device_type == "Server":
        return 0.8
    if device_type == "Cloud server":
        return 0.7
    if device_type == "Workstation":
        return 0.5
    return 0.6


def calculate_asset_context_score(
    *,
    internal_or_external: str | None,
    public_ip_addresses: str | None,
    pci: bool | None,
    pii: bool | None,
    compliance_flags: str | None,
    environment: str | None,
    device_type: str | None,
    category: str | None,
) -> dict[str, float | str]:
    """Calculate the weighted asset context score from DB-native asset fields."""
    crq_asset_exposure_score = _clamp(
        calculate_exposure_score(internal_or_external, public_ip_addresses),
        minimum=0.0,
        maximum=1.0,
    )
    crq_asset_data_sensitivity_score = _clamp(
        calculate_data_sensitivity_score(pci, pii, compliance_flags),
        minimum=0.0,
        maximum=1.0,
    )
    crq_asset_environment_score = _clamp(
        calculate_environment_score(environment),
        minimum=0.0,
        maximum=1.0,
    )
    crq_asset_type_score = _clamp(
        calculate_asset_type_score(device_type, category),
        minimum=0.0,
        maximum=1.0,
    )

    weighted_sum = (
        (EXPOSURE_WEIGHT * crq_asset_exposure_score)
        + (DATA_SENSITIVITY_WEIGHT * crq_asset_data_sensitivity_score)
        + (ENVIRONMENT_WEIGHT * crq_asset_environment_score)
        + (ASSET_TYPE_WEIGHT * crq_asset_type_score)
    )
    crq_asset_context_score = _round_score(_clamp(weighted_sum * 10, minimum=0.0, maximum=10.0))

    return {
        "crq_asset_exposure_score": crq_asset_exposure_score,
        "crq_asset_data_sensitivity_score": crq_asset_data_sensitivity_score,
        "environment": environment,
        "crq_asset_environment_score": crq_asset_environment_score,
        "crq_asset_type_score": crq_asset_type_score,
        "crq_asset_context_score": crq_asset_context_score,
    }


def _scoring_query(where_sql: str) -> str:
    return f"""
WITH finding_inputs AS (
    SELECT
        a.asset_id,
        COALESCE(
            MAX(f.crq_finding_score) FILTER (WHERE f.crq_finding_score IS NOT NULL),
            0.0
        ) AS max_score,
        COALESCE(SUM(f.crq_finding_score) FILTER (WHERE f.crq_finding_score IS NOT NULL), 0.0) AS total_score,
        COUNT(f.crq_finding_score) FILTER (WHERE f.crq_finding_score IS NOT NULL) AS finding_count
    FROM assets a
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    {where_sql}
    GROUP BY a.asset_id
), ranked_scores AS (
    SELECT
        a.asset_id,
        f.crq_finding_score,
        ROW_NUMBER() OVER (
            PARTITION BY a.asset_id
            ORDER BY f.crq_finding_score DESC, f.id DESC
        ) AS rank_index
    FROM assets a
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    {where_sql}
), top_k AS (
    SELECT
        asset_id,
        AVG(crq_finding_score) AS top_k_avg
    FROM ranked_scores
    WHERE crq_finding_score IS NOT NULL
      AND rank_index <= 5
    GROUP BY asset_id
)
SELECT
    a.asset_id,
    a.hostname,
    a.internal_or_external,
    a.public_ip_addresses,
    a.pci,
    a.pii,
    a.compliance_flags,
    a.environment,
    a.device_type,
    a.category,
    fi.max_score,
    COALESCE(tk.top_k_avg, 0.0) AS top_k_avg,
    fi.total_score,
    fi.finding_count
FROM assets a
LEFT JOIN finding_inputs fi ON fi.asset_id = a.asset_id
LEFT JOIN top_k tk ON tk.asset_id = a.asset_id
{where_sql}
ORDER BY a.asset_id
"""


def _computed_asset_scores(db: Session, asset_ids: Sequence[str] | None = None) -> list[dict]:
    where_sql = _where_clause(asset_ids)
    query_text = _scoring_query(where_sql)
    query = _bind_asset_ids(query_text) if asset_ids else text(query_text)
    params = {"asset_ids": list(asset_ids)} if asset_ids else {}
    rows = [dict(row._mapping) for row in db.execute(query, params)]

    computed_rows: list[dict] = []
    for row in rows:
        finding_count = int(row["finding_count"] or 0)
        top_k_avg = float(row["top_k_avg"] or 0.0)
        max_score = float(row["max_score"] or 0.0)
        total_score = float(row["total_score"] or 0.0)

        if finding_count <= 0:
            crq_asset_aggregated_finding_risk = 0.0
            log_scaled_component = 0.0
        else:
            log_scaled_component = (
                math.log(1 + total_score) / math.log(1 + (finding_count * 10))
            ) * 10
            crq_asset_aggregated_finding_risk = _round_score(_clamp(
                (0.5 * max_score) + (0.3 * top_k_avg) + (0.2 * log_scaled_component),
                minimum=0.0,
                maximum=10.0,
            ))

        context = calculate_asset_context_score(
            internal_or_external=row["internal_or_external"],
            public_ip_addresses=row["public_ip_addresses"],
            pci=row["pci"],
            pii=row["pii"],
            compliance_flags=row["compliance_flags"],
            environment=row["environment"],
            device_type=row["device_type"],
            category=row["category"],
        )

        computed_rows.append(
            {
                "asset_id": row["asset_id"],
                "crq_asset_aggregated_finding_risk": crq_asset_aggregated_finding_risk,
                **context,
            }
        )

    return computed_rows


def score_assets(
    db: Session,
    *,
    scored_at: datetime | None = None,
    asset_ids: Sequence[str] | None = None,
) -> int:
    timestamp = scored_at or datetime.now(timezone.utc)
    computed_rows = _computed_asset_scores(db, asset_ids=asset_ids)
    if not computed_rows:
        return 0

    update_stmt = text(
        """
UPDATE assets
SET
    crq_asset_aggregated_finding_risk = :crq_asset_aggregated_finding_risk,
    crq_asset_exposure_score = :crq_asset_exposure_score,
    crq_asset_data_sensitivity_score = :crq_asset_data_sensitivity_score,
    environment = :environment,
    crq_asset_environment_score = :crq_asset_environment_score,
    crq_asset_type_score = :crq_asset_type_score,
    crq_asset_context_score = :crq_asset_context_score,
    crq_asset_scored_at = :scored_at
WHERE asset_id = :asset_id
"""
    )

    params = [
        {
            "asset_id": row["asset_id"],
            "crq_asset_aggregated_finding_risk": row["crq_asset_aggregated_finding_risk"],
            "crq_asset_exposure_score": row["crq_asset_exposure_score"],
            "crq_asset_data_sensitivity_score": row["crq_asset_data_sensitivity_score"],
            "environment": row["environment"],
            "crq_asset_environment_score": row["crq_asset_environment_score"],
            "crq_asset_type_score": row["crq_asset_type_score"],
            "crq_asset_context_score": row["crq_asset_context_score"],
            "scored_at": timestamp,
        }
        for row in computed_rows
    ]
    result = db.execute(update_stmt, params)
    db.commit()
    if result.rowcount is not None and result.rowcount >= 0:
        return result.rowcount
    return len(params)

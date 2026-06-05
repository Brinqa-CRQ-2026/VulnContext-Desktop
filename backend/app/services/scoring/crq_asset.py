"""Asset-level CRQ scoring helpers.

Asset component modifiers are 0-1 values. Aggregated finding risk, context, and
final asset risk are product-facing 0-10 values.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import Engine, bindparam, inspect, text
from sqlalchemy.orm import Session

ASSET_SCORING_VERSION = "v5"

ASSET_SCORING_COLUMNS: tuple[str, ...] = (
    "crq_asset_aggregated_finding_risk",
    "crq_asset_exposure_score",
    "crq_asset_data_sensitivity_score",
    "crq_asset_environment_score",
    "crq_asset_type_score",
    "crq_asset_context_score",
    "crq_asset_risk_score",
    "crq_asset_finding_count",
    "crq_asset_scored_at",
)

EXPOSURE_WEIGHT = 0.35
DATA_SENSITIVITY_WEIGHT = 0.30
ENVIRONMENT_WEIGHT = 0.20
ASSET_TYPE_WEIGHT = 0.15

FINDING_MAX_WEIGHT = 0.25
FINDING_WEIGHTED_SEVERITY_AVERAGE_WEIGHT = 0.50
FINDING_SEVERITY_BURDEN_WEIGHT = 0.25


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _round_score(value: float) -> float:
    return round(value, 2)


def _is_true(value: bool | int | str | None) -> bool:
    if value is True:
        return True
    if isinstance(value, int) and value == 1:
        return True
    if isinstance(value, str) and value.strip().lower() == "true":
        return True
    return False


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


def calculate_aggregated_finding_risk(
    finding_scores: Sequence[float | None] | None,
) -> float:
    """Aggregate 0-10 finding scores into a 0-10 asset risk signal."""
    if not finding_scores:
        return 0.0

    normalized_scores = [
        _clamp(score, minimum=0.0, maximum=10.0)
        for score in finding_scores
        if score is not None
    ]
    if not normalized_scores:
        return 0.0

    max_finding_score = max(normalized_scores)
    weighted_severity_average = calculate_weighted_severity_average(normalized_scores)
    severity_burden_score = calculate_severity_burden_score(normalized_scores)

    aggregated = (
        (FINDING_MAX_WEIGHT * max_finding_score)
        + (FINDING_WEIGHTED_SEVERITY_AVERAGE_WEIGHT * weighted_severity_average)
        + (FINDING_SEVERITY_BURDEN_WEIGHT * severity_burden_score)
    )
    return _round_score(_clamp(aggregated, minimum=0.0, maximum=10.0))


def calculate_weighted_severity_average(finding_scores: Sequence[float]) -> float:
    weighted_total = 0.0
    weight_total = 0.0
    for score in finding_scores:
        weight = _finding_band_weight(score)
        weighted_total += score * weight
        weight_total += weight

    if weight_total <= 0.0:
        return 0.0
    return weighted_total / weight_total


def calculate_severity_burden_score(finding_scores: Sequence[float]) -> float:
    finding_count = len(finding_scores)
    if finding_count <= 0:
        return 0.0

    weighted_burden = sum(_finding_burden_weight(score) for score in finding_scores)
    severity_burden_score = (
        math.log(1 + weighted_burden) / math.log(1 + (finding_count * 10))
    ) * 10
    return _clamp(severity_burden_score, minimum=0.0, maximum=10.0)


def _finding_band_weight(score: float) -> float:
    if score >= 9.0:
        return 4.0
    if score >= 6.0:
        return 2.0
    if score >= 3.0:
        return 1.0
    return 0.5


def _finding_burden_weight(score: float) -> float:
    if score >= 9.0:
        return 10.0
    if score >= 6.0:
        return 5.0
    if score >= 3.0:
        return 2.0
    return 0.5


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
        return 0.5
    return 0.4


def calculate_data_sensitivity_score(
    pci: bool | None,
    pii: bool | None,
    compliance_flags: str | None,
) -> float:
    """Expected input: DB-native booleans; compliance flags are ignored in v5."""
    _ = compliance_flags
    pci_is_true = _is_true(pci)
    pii_is_true = _is_true(pii)
    if pci_is_true and pii_is_true:
        return 1.0
    if pci_is_true or pii_is_true:
        return 0.8
    if pci is None and pii is None:
        return 0.4
    return 0.2


def calculate_environment_score(environment: str | None) -> float:
    """Expected input: canonical environment values from assets.environment."""
    if environment in {"production", "prod"}:
        return 1.0
    if environment in {"test", "staging", "qa"}:
        return 0.6
    if environment in {"development", "dev"}:
        return 0.3
    return 0.5


def calculate_asset_type_score(device_type: str | None, category: str | None) -> float:
    """Score normalized device_type values; generic category values do not affect v5."""
    _ = category
    if device_type == "Firewall":
        return 1.0
    if device_type == "Router":
        return 0.95
    if device_type == "Network":
        return 0.95
    if device_type == "Hypervisor":
        return 0.9
    if device_type == "Server":
        return 0.8
    if device_type == "Cloud server":
        return 0.8
    if device_type == "Workstation":
        return 0.4
    if device_type == "Printer":
        return 0.3
    if device_type == "Unknown":
        return 0.5
    return 0.5


def calculate_asset_risk_score(
    aggregated_finding_risk: float,
    context_score: float,
) -> float:
    """Calculate final 0-10 asset risk from finding pressure adjusted by context."""
    if aggregated_finding_risk <= 0.0:
        return 0.0

    context_multiplier = 0.7 + (0.3 * context_score / 10)
    final_score = aggregated_finding_risk * context_multiplier
    return _round_score(_clamp(final_score, minimum=0.0, maximum=10.0))


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
    """Calculate 0-10 exposure-adjusted business context from 0-1 components."""
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
WITH finding_scores AS (
    SELECT
        a.asset_id,
        CASE
            WHEN f.crq_finding_score IS NULL THEN NULL
            WHEN f.crq_finding_score < 0.0 THEN 0.0
            WHEN f.crq_finding_score > 10.0 THEN 10.0
            ELSE f.crq_finding_score
        END AS finding_score
    FROM assets a
    LEFT JOIN findings f ON f.asset_id = a.asset_id
    {where_sql}
), finding_inputs AS (
    SELECT
        asset_id,
        COALESCE(MAX(finding_score), 0.0) AS max_score,
        COALESCE(
            SUM(
                finding_score * CASE
                    WHEN finding_score >= 9.0 THEN 4.0
                    WHEN finding_score >= 6.0 THEN 2.0
                    WHEN finding_score >= 3.0 THEN 1.0
                    ELSE 0.5
                END
            ) FILTER (WHERE finding_score IS NOT NULL),
            0.0
        ) AS weighted_severity_total,
        COALESCE(
            SUM(
                CASE
                    WHEN finding_score >= 9.0 THEN 4.0
                    WHEN finding_score >= 6.0 THEN 2.0
                    WHEN finding_score >= 3.0 THEN 1.0
                    WHEN finding_score IS NOT NULL THEN 0.5
                    ELSE 0.0
                END
            ),
            0.0
        ) AS severity_weight_total,
        COALESCE(
            SUM(
                CASE
                    WHEN finding_score >= 9.0 THEN 10.0
                    WHEN finding_score >= 6.0 THEN 5.0
                    WHEN finding_score >= 3.0 THEN 2.0
                    WHEN finding_score IS NOT NULL THEN 0.5
                    ELSE 0.0
                END
            ),
            0.0
        ) AS weighted_burden,
        COUNT(finding_score) AS finding_count
    FROM finding_scores
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
    fi.weighted_severity_total,
    fi.severity_weight_total,
    fi.weighted_burden,
    fi.finding_count
FROM assets a
LEFT JOIN finding_inputs fi ON fi.asset_id = a.asset_id
{where_sql}
ORDER BY a.asset_id
"""


def _calculate_aggregated_finding_risk_from_parts(
    *,
    max_score: float,
    weighted_severity_total: float,
    severity_weight_total: float,
    weighted_burden: float,
    finding_count: int,
) -> float:
    if finding_count <= 0:
        return 0.0

    weighted_severity_average = (
        weighted_severity_total / severity_weight_total
        if severity_weight_total > 0.0
        else 0.0
    )
    severity_burden_score = (
        math.log(1 + weighted_burden) / math.log(1 + (finding_count * 10))
    ) * 10
    aggregated = (
        (FINDING_MAX_WEIGHT * max_score)
        + (FINDING_WEIGHTED_SEVERITY_AVERAGE_WEIGHT * weighted_severity_average)
        + (FINDING_SEVERITY_BURDEN_WEIGHT * severity_burden_score)
    )
    return _round_score(_clamp(aggregated, minimum=0.0, maximum=10.0))


def _computed_asset_scores(db: Session, asset_ids: Sequence[str] | None = None) -> list[dict]:
    where_sql = _where_clause(asset_ids)
    query_text = _scoring_query(where_sql)
    query = _bind_asset_ids(query_text) if asset_ids else text(query_text)
    params = {"asset_ids": list(asset_ids)} if asset_ids else {}
    rows = [dict(row._mapping) for row in db.execute(query, params)]

    computed_rows: list[dict] = []
    for row in rows:
        finding_count = int(row["finding_count"] or 0)
        max_score = float(row["max_score"] or 0.0)
        weighted_severity_total = float(row["weighted_severity_total"] or 0.0)
        severity_weight_total = float(row["severity_weight_total"] or 0.0)
        weighted_burden = float(row["weighted_burden"] or 0.0)

        if finding_count <= 0:
            crq_asset_aggregated_finding_risk = 0.0
        else:
            crq_asset_aggregated_finding_risk = _calculate_aggregated_finding_risk_from_parts(
                max_score=max_score,
                weighted_severity_total=weighted_severity_total,
                severity_weight_total=severity_weight_total,
                weighted_burden=weighted_burden,
                finding_count=finding_count,
            )

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
        crq_asset_risk_score = calculate_asset_risk_score(
            crq_asset_aggregated_finding_risk,
            float(context["crq_asset_context_score"]),
        )

        computed_rows.append(
            {
                "asset_id": row["asset_id"],
                "crq_asset_aggregated_finding_risk": crq_asset_aggregated_finding_risk,
                **context,
                "crq_asset_risk_score": crq_asset_risk_score,
                "crq_asset_finding_count": finding_count,
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
    crq_asset_risk_score = :crq_asset_risk_score,
    crq_asset_finding_count = :crq_asset_finding_count,
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
            "crq_asset_risk_score": row["crq_asset_risk_score"],
            "crq_asset_finding_count": row["crq_asset_finding_count"],
            "scored_at": timestamp,
        }
        for row in computed_rows
    ]
    result = db.execute(update_stmt, params)
    db.commit()
    if result.rowcount is not None and result.rowcount >= 0:
        return result.rowcount
    return len(params)

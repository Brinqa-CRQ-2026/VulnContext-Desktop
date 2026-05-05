from __future__ import annotations

import re

from fastapi import HTTPException
from sqlalchemy import or_

from app import models, schemas
from app.api.common import normalize_risk_band, summary_band_filter
from app.repositories.topology import has_topology_schema

REQUIRED_TOPOLOGY_TABLES = (
    "companies",
    "business_units",
    "business_services",
    "applications",
)


def _company_summary(company: models.Company | None) -> schemas.CompanySummary | None:
    if company is None:
        return None
    return schemas.CompanySummary(name=company.name)


def _require_topology_schema(db) -> None:
    if has_topology_schema(db):
        return
    raise HTTPException(
        status_code=503,
        detail=(
            "Normalized topology tables are not initialized. "
            "Apply docs/backend/topology-seed/topology-expansion.sql before using "
            "business-unit topology routes."
        ),
    )


def _parse_business_criticality(label: str | None) -> tuple[int | None, str | None]:
    if not label:
        return None, None

    match = re.match(r"^\s*(\d+)\s*[-:]\s*(.+?)\s*$", label)
    if match:
        return int(match.group(1)), match.group(2).strip().title()

    return None, label.strip().title()


def _bucket_asset_score(score: float | None) -> str:
    if score is None:
        return "unscored"
    if score >= 9:
        return "critical"
    if score >= 7:
        return "high"
    if score >= 4:
        return "medium"
    return "low"


def _build_asset_score_distribution(scores: list[float | None]) -> schemas.AssetScoreDistribution:
    buckets = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0,
        "unscored": 0,
    }
    for score in scores:
        buckets[_bucket_asset_score(score)] += 1
    return schemas.AssetScoreDistribution(**buckets)


def _build_asset_type_distribution(
    assets: list[models.Asset], *, limit: int = 5
) -> list[schemas.AssetTypeDistributionItem]:
    counts: dict[str, int] = {}
    for asset in assets:
        label = (
            (asset.device_type or "").strip()
            or (asset.category or "").strip()
            or "Unknown"
        )
        counts[label] = counts.get(label, 0) + 1

    rows = sorted(counts.items(), key=lambda item: (-item[1], item[0].lower()))
    return [
        schemas.AssetTypeDistributionItem(label=label, count=count)
        for label, count in rows[:limit]
    ]


def _asset_findings_filters(
    *,
    asset_id: str,
    risk_band: str | None = None,
    kev_only: bool = False,
    source: str | None = None,
    search: str | None = None,
):
    filters = [models.Finding.asset_id == asset_id]
    if source is not None and source.strip() and source.strip().lower() != "brinqa":
        return filters, True
    if risk_band is not None:
        filters.append(summary_band_filter(normalize_risk_band(risk_band)))
    if kev_only:
        filters.append(models.Finding.crq_finding_is_kev.is_(True))
    if search is not None and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                models.Finding.finding_name.ilike(term),
                models.Finding.cve_id.ilike(term),
                models.Finding.finding_id.ilike(term),
            )
        )
    return filters, False


def _to_asset_findings_analytics_asset(asset: models.Asset) -> schemas.AssetFindingsAnalyticsAsset:
    business_unit = asset.__dict__.get("business_unit")
    business_service_rel = asset.__dict__.get("business_service_rel")
    application_rel = asset.__dict__.get("application_rel")
    return schemas.AssetFindingsAnalyticsAsset(
        asset_id=asset.asset_id,
        hostname=asset.hostname,
        business_unit=business_unit.name if business_unit else None,
        business_service=business_service_rel.name if business_service_rel else asset.business_service,
        application=application_rel.name if application_rel else asset.application,
        status=asset.status,
        environment=asset.environment,
        internal_or_external=asset.internal_or_external,
        device_type=asset.device_type,
        category=asset.category,
    )

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func

from app import models, schemas
from app.repositories.topology import (
    asset_query_with_topology,
    business_service_by_slugs,
)
from app.services.topology.shared import (
    _build_asset_score_distribution,
    _build_asset_type_distribution,
    _company_summary,
    _parse_business_criticality,
    _require_topology_schema,
)
from app.services.views.helpers import (
    derive_risk_band,
    to_application_summary,
    to_asset_summary,
)


def get_business_service_detail(business_unit_slug: str, business_service_slug: str, db):
    _require_topology_schema(db)
    business_service = business_service_by_slugs(db, business_unit_slug, business_service_slug)
    if business_service is None:
        raise HTTPException(status_code=404, detail="Business service not found.")

    direct_assets = (
        asset_query_with_topology(db)
        .filter(
            models.Asset.business_service_id == business_service.id,
            models.Asset.application_id.is_(None),
        )
        .order_by(func.lower(func.coalesce(models.Asset.hostname, models.Asset.asset_id)))
        .all()
    )
    service_assets = asset_query_with_topology(db).filter(
        models.Asset.business_service_id == business_service.id
    ).all()

    applications = sorted(business_service.applications, key=lambda item: item.name.lower())

    return schemas.BusinessServiceDetail(
        company=_company_summary(business_service.business_unit.company),
        business_unit=business_service.business_unit.name,
        business_service=business_service.name,
        slug=business_service.slug,
        source_id=business_service.source_id,
        description=business_service.description,
        criticality_label=business_service.criticality_label,
        division=business_service.division,
        manager=business_service.manager,
        risk_score=business_service.crq_business_service_risk_score,
        risk_band=derive_risk_band(business_service.crq_business_service_risk_score),
        priority_score=business_service.crq_business_service_priority_score,
        business_criticality_score=business_service.business_criticality_score,
        aggregated_application_risk=business_service.crq_business_service_aggregated_application_risk,
        aggregated_direct_asset_risk=business_service.crq_business_service_aggregated_direct_asset_risk,
        scored_at=business_service.crq_business_service_scored_at,
        metrics=schemas.TopologyMetrics(
            total_applications=int(business_service.crq_business_service_application_count or 0),
            total_assets=int(business_service.crq_business_service_asset_count or 0),
            total_findings=int(business_service.crq_business_service_finding_count or 0),
        ),
        applications=[
            to_application_summary(application)
            for application in applications
        ],
        direct_assets=[
            to_asset_summary(asset)
            for asset in direct_assets
        ],
    )


def get_business_service_analytics(business_unit_slug: str, business_service_slug: str, db):
    _require_topology_schema(db)
    business_service = business_service_by_slugs(db, business_unit_slug, business_service_slug)
    if business_service is None:
        raise HTTPException(status_code=404, detail="Business service not found.")

    service_assets = (
        asset_query_with_topology(db)
        .filter(models.Asset.business_service_id == business_service.id)
        .all()
    )
    applications = sorted(business_service.applications, key=lambda item: item.name.lower())
    business_criticality_score, business_criticality_label = _parse_business_criticality(
        business_service.criticality_label
    )
    if business_service.business_criticality_score is not None:
        business_criticality_score = business_service.business_criticality_score

    return schemas.BusinessServiceAnalytics(
        service_risk_score=business_service.crq_business_service_risk_score,
        service_risk_label=derive_risk_band(business_service.crq_business_service_risk_score),
        service_priority_score=business_service.crq_business_service_priority_score,
        business_criticality_score=business_criticality_score,
        business_criticality_max=5,
        business_criticality_label=business_criticality_label,
        totals=schemas.BusinessServiceAnalyticsTotals(
            applications=int(business_service.crq_business_service_application_count or len(applications)),
            assets=int(business_service.crq_business_service_asset_count or 0),
            findings=int(business_service.crq_business_service_finding_count or 0),
        ),
        asset_criticality_distribution=_build_asset_score_distribution(
            [asset.crq_asset_context_score for asset in service_assets]
        ),
        asset_type_distribution=_build_asset_type_distribution(service_assets, limit=5),
    )

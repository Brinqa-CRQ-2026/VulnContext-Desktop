from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func

from app import models, schemas
from app.repositories.topology import application_by_slugs, asset_query_with_topology
from app.services.topology.shared import _company_summary, _require_topology_schema
from app.services.views.helpers import to_asset_summary


def get_application_detail(
    business_unit_slug: str,
    business_service_slug: str,
    application_slug: str,
    db,
):
    _require_topology_schema(db)
    application = application_by_slugs(db, business_unit_slug, business_service_slug, application_slug)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")

    assets = (
        asset_query_with_topology(db)
        .filter(models.Asset.application_id == application.id)
        .order_by(func.lower(func.coalesce(models.Asset.hostname, models.Asset.asset_id)))
        .all()
    )

    return schemas.ApplicationDetail(
        company=_company_summary(application.business_service.business_unit.company),
        business_unit=application.business_service.business_unit.name,
        business_service=application.business_service.name,
        application=application.name,
        slug=application.slug,
        description=application.description,
        tags=list(application.tags) if application.tags is not None else None,
        first_seen_at=application.first_seen_at,
        metrics=schemas.TopologyMetrics(
            total_assets=int(application.crq_application_asset_count or 0),
            total_findings=int(application.crq_application_finding_count or 0),
        ),
        aggregated_asset_risk=application.crq_application_aggregated_asset_risk,
        compliance_score=application.crq_application_compliance_score,
        application_risk_score=application.crq_application_risk_score,
        scored_at=application.crq_application_scored_at,
        assets=[
            to_asset_summary(asset)
            for asset in assets
        ],
    )

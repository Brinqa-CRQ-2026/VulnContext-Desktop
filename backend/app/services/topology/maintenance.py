from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models


def backfill_asset_topology_foreign_keys(db: Session) -> int:
    """Populate asset topology foreign keys by exact name match.

    Matching is intentionally strict during the transition:
    - `assets.business_service` must exactly equal `business_services.name`
    - `assets.application` must exactly equal an application name under that service
    - when no matching application exists, `application_id` remains null
    """

    services = db.query(models.BusinessService).all()
    service_by_name = {service.name: service for service in services}
    applications_by_service_name: dict[str, dict[str, models.Application]] = {}
    for application in db.query(models.Application).all():
        service_name = application.business_service.name
        applications_by_service_name.setdefault(service_name, {})[application.name] = application

    updated_assets = 0
    for asset in db.query(models.Asset).all():
        service_name = asset.business_service
        if not service_name:
            continue

        service = service_by_name.get(service_name)
        if service is None:
            continue

        company = service.business_unit.company
        application = None
        if asset.application:
            application = applications_by_service_name.get(service_name, {}).get(asset.application)

        asset.company_id = company.id if company else None
        asset.business_unit_id = service.business_unit_id
        asset.business_service_id = service.id
        asset.application_id = application.id if application else None
        updated_assets += 1

    db.flush()
    refresh_persisted_topology_counts(db)
    return updated_assets


def refresh_persisted_topology_counts(db: Session) -> None:
    """Refresh persisted count rollups used by topology read routes."""
    finding_counts_by_asset = dict(
        db.query(models.Finding.asset_id, func.count(models.Finding.id))
        .group_by(models.Finding.asset_id)
        .all()
    )
    for asset in db.query(models.Asset).all():
        asset.crq_asset_finding_count = int(finding_counts_by_asset.get(asset.asset_id, 0))
    db.flush()

    application_asset_counts = dict(
        db.query(models.Asset.application_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.application_id.is_not(None))
        .group_by(models.Asset.application_id)
        .all()
    )
    application_finding_counts = dict(
        db.query(models.Asset.application_id, func.sum(models.Asset.crq_asset_finding_count))
        .filter(models.Asset.application_id.is_not(None))
        .group_by(models.Asset.application_id)
        .all()
    )
    for application in db.query(models.Application).all():
        application.crq_application_asset_count = int(application_asset_counts.get(application.id, 0) or 0)
        application.crq_application_finding_count = int(application_finding_counts.get(application.id, 0) or 0)
    db.flush()

    service_application_counts = dict(
        db.query(models.Application.business_service_id, func.count(models.Application.id))
        .group_by(models.Application.business_service_id)
        .all()
    )
    service_asset_counts = dict(
        db.query(models.Asset.business_service_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.business_service_id.is_not(None))
        .group_by(models.Asset.business_service_id)
        .all()
    )
    service_finding_counts = dict(
        db.query(models.Asset.business_service_id, func.sum(models.Asset.crq_asset_finding_count))
        .filter(models.Asset.business_service_id.is_not(None))
        .group_by(models.Asset.business_service_id)
        .all()
    )
    for service in db.query(models.BusinessService).all():
        service.crq_business_service_application_count = int(service_application_counts.get(service.id, 0) or 0)
        service.crq_business_service_asset_count = int(service_asset_counts.get(service.id, 0) or 0)
        service.crq_business_service_finding_count = int(service_finding_counts.get(service.id, 0) or 0)
    db.flush()

    unit_service_counts = dict(
        db.query(models.BusinessService.business_unit_id, func.count(models.BusinessService.id))
        .group_by(models.BusinessService.business_unit_id)
        .all()
    )
    unit_application_counts = dict(
        db.query(
            models.BusinessService.business_unit_id,
            func.sum(models.BusinessService.crq_business_service_application_count),
        )
        .group_by(models.BusinessService.business_unit_id)
        .all()
    )
    unit_asset_counts = dict(
        db.query(
            models.BusinessService.business_unit_id,
            func.sum(models.BusinessService.crq_business_service_asset_count),
        )
        .group_by(models.BusinessService.business_unit_id)
        .all()
    )
    unit_finding_counts = dict(
        db.query(
            models.BusinessService.business_unit_id,
            func.sum(models.BusinessService.crq_business_service_finding_count),
        )
        .group_by(models.BusinessService.business_unit_id)
        .all()
    )
    for business_unit in db.query(models.BusinessUnit).all():
        business_unit.crq_business_unit_business_service_count = int(
            unit_service_counts.get(business_unit.id, 0) or 0
        )
        business_unit.crq_business_unit_application_count = int(
            unit_application_counts.get(business_unit.id, 0) or 0
        )
        business_unit.crq_business_unit_asset_count = int(unit_asset_counts.get(business_unit.id, 0) or 0)
        business_unit.crq_business_unit_finding_count = int(
            unit_finding_counts.get(business_unit.id, 0) or 0
        )

    db.flush()

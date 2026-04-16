from __future__ import annotations

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
    return updated_assets

from __future__ import annotations

from sqlalchemy import func, inspect
from sqlalchemy.orm import Session, joinedload

from app import models

REQUIRED_TOPOLOGY_TABLES = (
    "companies",
    "business_units",
    "business_services",
    "applications",
)


def has_topology_schema(db: Session) -> bool:
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(table_name) for table_name in REQUIRED_TOPOLOGY_TABLES)


def asset_query_with_topology(db: Session):
    query = db.query(models.Asset)
    if not has_topology_schema(db):
        return query
    return query.options(
        joinedload(models.Asset.company),
        joinedload(models.Asset.business_unit),
        joinedload(models.Asset.business_service_rel),
        joinedload(models.Asset.application_rel),
    )


def findings_for_business_unit(db: Session, business_unit_id: str, *, include_asset: bool = False):
    query = (
        db.query(models.Finding)
        .join(models.Asset, models.Finding.asset_id == models.Asset.asset_id)
        .filter(models.Asset.business_unit_id == business_unit_id)
    )
    if include_asset:
        query = query.options(joinedload(models.Finding.asset))
    return query


def business_units(db: Session):
    return (
        db.query(models.BusinessUnit)
        .options(joinedload(models.BusinessUnit.company))
        .order_by(func.lower(models.BusinessUnit.name))
        .all()
    )


def business_unit_by_slug(db: Session, slug: str):
    return (
        db.query(models.BusinessUnit)
        .options(joinedload(models.BusinessUnit.company))
        .filter(models.BusinessUnit.slug == slug)
        .first()
    )


def business_services_for_unit(db: Session, business_unit_id: str):
    return (
        db.query(models.BusinessService)
        .filter(models.BusinessService.business_unit_id == business_unit_id)
        .order_by(func.lower(models.BusinessService.name))
        .all()
    )


def business_service_by_slugs(db: Session, business_unit_slug: str, business_service_slug: str):
    return (
        db.query(models.BusinessService)
        .join(models.BusinessService.business_unit)
        .options(
            joinedload(models.BusinessService.business_unit).joinedload(models.BusinessUnit.company),
            joinedload(models.BusinessService.applications),
        )
        .filter(
            models.BusinessUnit.slug == business_unit_slug,
            models.BusinessService.slug == business_service_slug,
        )
        .first()
    )


def application_by_slugs(db: Session, business_unit_slug: str, business_service_slug: str, application_slug: str):
    return (
        db.query(models.Application)
        .join(models.Application.business_service)
        .join(models.BusinessService.business_unit)
        .options(
            joinedload(models.Application.business_service)
            .joinedload(models.BusinessService.business_unit)
            .joinedload(models.BusinessUnit.company)
        )
        .filter(
            models.BusinessUnit.slug == business_unit_slug,
            models.BusinessService.slug == business_service_slug,
            models.Application.slug == application_slug,
        )
        .first()
    )


def asset_by_id(db: Session, asset_id: str):
    return asset_query_with_topology(db).filter(models.Asset.asset_id == asset_id).first()

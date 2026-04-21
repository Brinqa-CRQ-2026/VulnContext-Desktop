"""Business-unit-first topology and asset drill-down routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, inspect, or_
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api.common import to_asset_detail, to_asset_summary, to_finding_summary
from app.core.db import get_db
from app.services.brinqa_detail import asset_detail_service

router = APIRouter(tags=["topology"])

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


def _has_topology_schema(db: Session) -> bool:
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(table_name) for table_name in REQUIRED_TOPOLOGY_TABLES)


def _require_topology_schema(db: Session) -> None:
    if _has_topology_schema(db):
        return
    raise HTTPException(
        status_code=503,
        detail=(
            "Normalized topology tables are not initialized. "
            "Apply docs/backend/topology-seed/topology-expansion.sql before using "
            "business-unit topology routes."
        ),
    )


def _asset_query_with_topology(db: Session):
    query = db.query(models.Asset)
    if not _has_topology_schema(db):
        return query
    return query.options(
        joinedload(models.Asset.company),
        joinedload(models.Asset.business_unit),
        joinedload(models.Asset.business_service_rel),
        joinedload(models.Asset.application_rel),
    )


def _finding_counts_for_asset_ids(db: Session, asset_ids: list[str]) -> dict[str, int]:
    if not asset_ids:
        return {}
    rows = (
        db.query(models.Finding.asset_id, func.count(models.Finding.id))
        .filter(models.Finding.asset_id.in_(asset_ids))
        .group_by(models.Finding.asset_id)
        .all()
    )
    return {asset_id: int(count) for asset_id, count in rows}


def _apply_asset_filters(
    query,
    *,
    topology_ready: bool,
    business_unit: str | None = None,
    business_service: str | None = None,
    application: str | None = None,
):
    if business_unit is not None:
        if not topology_ready:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The business_unit filter requires the normalized topology schema. "
                    "Apply docs/backend/topology-seed/topology-expansion.sql first."
                ),
            )
        query = query.outerjoin(models.Asset.business_unit).filter(models.BusinessUnit.name == business_unit)
    if business_service is not None:
        if topology_ready:
            query = query.outerjoin(models.Asset.business_service_rel).filter(
                or_(
                    models.BusinessService.name == business_service,
                    models.Asset.business_service == business_service,
                )
            )
        else:
            query = query.filter(models.Asset.business_service == business_service)
    if application is not None:
        if topology_ready:
            query = query.outerjoin(models.Asset.application_rel).filter(
                or_(
                    models.Application.name == application,
                    models.Asset.application == application,
                )
            )
        else:
            query = query.filter(models.Asset.application == application)
    return query


@router.get("/topology/companies", response_model=list[schemas.CompanyDetail])
def get_companies(db: Session = Depends(get_db)):
    _require_topology_schema(db)
    companies = (
        db.query(models.Company)
        .order_by(func.lower(models.Company.name))
        .all()
    )

    # Get counts for each company
    bu_counts = dict(
        db.query(models.BusinessUnit.company_id, func.count(models.BusinessUnit.id))
        .filter(models.BusinessUnit.company_id.is_not(None))
        .group_by(models.BusinessUnit.company_id)
        .all()
    )
    
    asset_counts = dict(
        db.query(models.Asset.company_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.company_id.is_not(None))
        .group_by(models.Asset.company_id)
        .all()
    )
    
    finding_counts = dict(
        db.query(models.Asset.company_id, func.count(models.Finding.id))
        .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
        .filter(models.Asset.company_id.is_not(None))
        .group_by(models.Asset.company_id)
        .all()
    )

    return [
        schemas.CompanyDetail(
            id=str(company.id),
            name=company.name,
            metrics=schemas.TopologyMetrics(
                total_business_services=int(bu_counts.get(company.id, 0)),
                total_assets=int(asset_counts.get(company.id, 0)),
                total_findings=int(finding_counts.get(company.id, 0)),
            ),
        )
        for company in companies
    ]


@router.get("/topology/companies/{company_id}", response_model=schemas.CompanyFullDetail)
def get_company_detail(company_id: str, db: Session = Depends(get_db)):
    _require_topology_schema(db)
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found.")

    business_units = (
        db.query(models.BusinessUnit)
        .filter(models.BusinessUnit.company_id == company_id)
        .order_by(func.lower(models.BusinessUnit.name))
        .all()
    )
    bu_ids = [bu.id for bu in business_units]

    services_by_bu: dict[str, list[schemas.BusinessServiceSummary]] = {bu.id: [] for bu in business_units}
    asset_counts_by_bu: dict[str, int] = {}
    finding_counts_by_bu: dict[str, int] = {}
    service_counts_by_bu: dict[str, int] = {}

    if bu_ids:
        services = (
            db.query(models.BusinessService)
            .filter(models.BusinessService.business_unit_id.in_(bu_ids))
            .order_by(func.lower(models.BusinessService.name))
            .all()
        )
        service_ids = [s.id for s in services]

        svc_asset_counts = dict(
            db.query(models.Asset.business_service_id, func.count(models.Asset.asset_id))
            .filter(models.Asset.business_service_id.in_(service_ids))
            .group_by(models.Asset.business_service_id)
            .all()
        ) if service_ids else {}

        svc_finding_counts = dict(
            db.query(models.Asset.business_service_id, func.count(models.Finding.id))
            .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
            .filter(models.Asset.business_service_id.in_(service_ids))
            .group_by(models.Asset.business_service_id)
            .all()
        ) if service_ids else {}

        svc_app_counts = dict(
            db.query(models.Application.business_service_id, func.count(models.Application.id))
            .filter(models.Application.business_service_id.in_(service_ids))
            .group_by(models.Application.business_service_id)
            .all()
        ) if service_ids else {}

        for svc in services:
            bu_id = svc.business_unit_id
            services_by_bu.setdefault(bu_id, []).append(
                schemas.BusinessServiceSummary(
                    business_service=svc.name,
                    slug=svc.slug,
                    metrics=schemas.TopologyMetrics(
                        total_applications=int(svc_app_counts.get(svc.id, 0)),
                        total_assets=int(svc_asset_counts.get(svc.id, 0)),
                        total_findings=int(svc_finding_counts.get(svc.id, 0)),
                    ),
                )
            )
            service_counts_by_bu[bu_id] = service_counts_by_bu.get(bu_id, 0) + 1

        asset_counts_by_bu = dict(
            db.query(models.Asset.business_unit_id, func.count(models.Asset.asset_id))
            .filter(models.Asset.business_unit_id.in_(bu_ids))
            .group_by(models.Asset.business_unit_id)
            .all()
        )
        finding_counts_by_bu = dict(
            db.query(models.Asset.business_unit_id, func.count(models.Finding.id))
            .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
            .filter(models.Asset.business_unit_id.in_(bu_ids))
            .group_by(models.Asset.business_unit_id)
            .all()
        )

    total_assets = sum(int(asset_counts_by_bu.get(bu.id, 0)) for bu in business_units)
    total_findings = sum(int(finding_counts_by_bu.get(bu.id, 0)) for bu in business_units)
    total_services = sum(service_counts_by_bu.get(bu.id, 0) for bu in business_units)

    return schemas.CompanyFullDetail(
        id=str(company.id),
        name=company.name,
        metrics=schemas.TopologyMetrics(
            total_business_services=total_services,
            total_assets=total_assets,
            total_findings=total_findings,
        ),
        business_units=[
            schemas.BusinessUnitWithServices(
                business_unit=bu.name,
                slug=bu.slug,
                metrics=schemas.TopologyMetrics(
                    total_business_services=service_counts_by_bu.get(bu.id, 0),
                    total_assets=int(asset_counts_by_bu.get(bu.id, 0)),
                    total_findings=int(finding_counts_by_bu.get(bu.id, 0)),
                ),
                business_services=services_by_bu.get(bu.id, []),
            )
            for bu in business_units
        ],
    )


@router.get("/topology/business-units", response_model=list[schemas.BusinessUnitSummary])
def get_business_units(db: Session = Depends(get_db)):
    _require_topology_schema(db)
    business_units = (
        db.query(models.BusinessUnit)
        .options(joinedload(models.BusinessUnit.company))
        .order_by(func.lower(models.BusinessUnit.name))
        .all()
    )

    service_counts = dict(
        db.query(models.BusinessService.business_unit_id, func.count(models.BusinessService.id))
        .group_by(models.BusinessService.business_unit_id)
        .all()
    )
    asset_counts = dict(
        db.query(models.Asset.business_unit_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.business_unit_id.is_not(None))
        .group_by(models.Asset.business_unit_id)
        .all()
    )
    finding_counts = dict(
        db.query(models.Asset.business_unit_id, func.count(models.Finding.id))
        .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
        .filter(models.Asset.business_unit_id.is_not(None))
        .group_by(models.Asset.business_unit_id)
        .all()
    )

    return [
        schemas.BusinessUnitSummary(
            company=_company_summary(business_unit.company),
            business_unit=business_unit.name,
            slug=business_unit.slug,
            metrics=schemas.TopologyMetrics(
                total_business_services=int(service_counts.get(business_unit.id, 0)),
                total_assets=int(asset_counts.get(business_unit.id, 0)),
                total_findings=int(finding_counts.get(business_unit.id, 0)),
            ),
        )
        for business_unit in business_units
    ]


@router.get("/topology/business-units/{business_unit_slug}", response_model=schemas.BusinessUnitDetail)
def get_business_unit_detail(business_unit_slug: str, db: Session = Depends(get_db)):
    _require_topology_schema(db)
    business_unit = (
        db.query(models.BusinessUnit)
        .options(joinedload(models.BusinessUnit.company))
        .filter(models.BusinessUnit.slug == business_unit_slug)
        .first()
    )
    if business_unit is None:
        raise HTTPException(status_code=404, detail="Business unit not found.")

    business_services = (
        db.query(models.BusinessService)
        .filter(models.BusinessService.business_unit_id == business_unit.id)
        .order_by(func.lower(models.BusinessService.name))
        .all()
    )
    business_service_ids = [service.id for service in business_services]

    asset_counts = dict(
        db.query(models.Asset.business_service_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.business_service_id.in_(business_service_ids))
        .group_by(models.Asset.business_service_id)
        .all()
    ) if business_service_ids else {}
    finding_counts = dict(
        db.query(models.Asset.business_service_id, func.count(models.Finding.id))
        .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
        .filter(models.Asset.business_service_id.in_(business_service_ids))
        .group_by(models.Asset.business_service_id)
        .all()
    ) if business_service_ids else {}

    applications_total = (
        db.query(func.count(models.Application.id))
        .filter(models.Application.business_service_id.in_(business_service_ids))
        .scalar()
        or 0
    ) if business_service_ids else 0

    return schemas.BusinessUnitDetail(
        company=_company_summary(business_unit.company),
        business_unit=business_unit.name,
        slug=business_unit.slug,
        uid=business_unit.uid,
        uuid=business_unit.uuid,
        description=business_unit.description,
        owner=business_unit.owner,
        data_integration=business_unit.data_integration,
        connector=business_unit.connector,
        connector_category=business_unit.connector_category,
        data_model=business_unit.data_model,
        last_integration_transaction_id=business_unit.last_integration_transaction_id,
        flow_state=business_unit.flow_state,
        created_by=business_unit.created_by,
        updated_by=business_unit.updated_by,
        source_last_modified_at=business_unit.source_last_modified_at,
        source_last_integrated_at=business_unit.source_last_integrated_at,
        source_created_at=business_unit.source_created_at,
        source_updated_at=business_unit.source_updated_at,
        metrics=schemas.TopologyMetrics(
            total_business_services=len(business_services),
            total_applications=int(applications_total),
            total_assets=sum(int(asset_counts.get(service.id, 0)) for service in business_services),
            total_findings=sum(int(finding_counts.get(service.id, 0)) for service in business_services),
        ),
        business_services=[
            schemas.BusinessServiceSummary(
                business_service=service.name,
                slug=service.slug,
                metrics=schemas.TopologyMetrics(
                    total_applications=len(service.applications),
                    total_assets=int(asset_counts.get(service.id, 0)),
                    total_findings=int(finding_counts.get(service.id, 0)),
                ),
            )
            for service in business_services
        ],
    )


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}",
    response_model=schemas.BusinessServiceDetail,
)
def get_business_service_detail(
    business_unit_slug: str,
    business_service_slug: str,
    db: Session = Depends(get_db),
):
    _require_topology_schema(db)
    business_service = (
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
    if business_service is None:
        raise HTTPException(status_code=404, detail="Business service not found.")

    direct_assets = (
        _asset_query_with_topology(db)
        .filter(
            models.Asset.business_service_id == business_service.id,
            models.Asset.application_id.is_(None),
        )
        .order_by(func.lower(func.coalesce(models.Asset.hostname, models.Asset.asset_id)))
        .all()
    )
    service_assets = _asset_query_with_topology(db).filter(
        models.Asset.business_service_id == business_service.id
    ).all()

    applications = sorted(business_service.applications, key=lambda item: item.name.lower())
    application_asset_counts = dict(
        db.query(models.Asset.application_id, func.count(models.Asset.asset_id))
        .filter(models.Asset.application_id.in_([application.id for application in applications]))
        .group_by(models.Asset.application_id)
        .all()
    ) if applications else {}
    application_finding_counts = dict(
        db.query(models.Asset.application_id, func.count(models.Finding.id))
        .join(models.Finding, models.Finding.asset_id == models.Asset.asset_id)
        .filter(models.Asset.application_id.in_([application.id for application in applications]))
        .group_by(models.Asset.application_id)
        .all()
    ) if applications else {}

    all_asset_ids = [asset.asset_id for asset in service_assets]
    direct_asset_ids = [asset.asset_id for asset in direct_assets]
    all_finding_counts = _finding_counts_for_asset_ids(db, all_asset_ids)
    direct_finding_counts = _finding_counts_for_asset_ids(db, direct_asset_ids)

    return schemas.BusinessServiceDetail(
        company=_company_summary(business_service.business_unit.company),
        business_unit=business_service.business_unit.name,
        business_service=business_service.name,
        slug=business_service.slug,
        uid=business_service.uid,
        uuid=business_service.uuid,
        description=business_service.description,
        criticality_label=business_service.criticality_label,
        division=business_service.division,
        manager=business_service.manager,
        data_integration=business_service.data_integration,
        connector=business_service.connector,
        connector_category=business_service.connector_category,
        data_model=business_service.data_model,
        last_integration_transaction_id=business_service.last_integration_transaction_id,
        flow_state=business_service.flow_state,
        created_by=business_service.created_by,
        updated_by=business_service.updated_by,
        source_last_modified_at=business_service.source_last_modified_at,
        source_last_integrated_at=business_service.source_last_integrated_at,
        source_created_at=business_service.source_created_at,
        source_updated_at=business_service.source_updated_at,
        metrics=schemas.TopologyMetrics(
            total_applications=len(applications),
            total_assets=len(service_assets),
            total_findings=sum(int(all_finding_counts.get(asset.asset_id, 0)) for asset in service_assets),
        ),
        applications=[
            schemas.ApplicationSummary(
                application=application.name,
                slug=application.slug,
                metrics=schemas.TopologyMetrics(
                    total_assets=int(application_asset_counts.get(application.id, 0)),
                    total_findings=int(application_finding_counts.get(application.id, 0)),
                ),
            )
            for application in applications
        ],
        direct_assets=[
            to_asset_summary(asset, finding_count=int(direct_finding_counts.get(asset.asset_id, 0)))
            for asset in direct_assets
        ],
    )


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}",
    response_model=schemas.ApplicationDetail,
)
def get_application_detail(
    business_unit_slug: str,
    business_service_slug: str,
    application_slug: str,
    db: Session = Depends(get_db),
):
    _require_topology_schema(db)
    application = (
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
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")

    assets = (
        _asset_query_with_topology(db)
        .filter(models.Asset.application_id == application.id)
        .order_by(func.lower(func.coalesce(models.Asset.hostname, models.Asset.asset_id)))
        .all()
    )
    finding_counts = _finding_counts_for_asset_ids(db, [asset.asset_id for asset in assets])

    return schemas.ApplicationDetail(
        company=_company_summary(application.business_service.business_unit.company),
        business_unit=application.business_service.business_unit.name,
        business_service=application.business_service.name,
        application=application.name,
        slug=application.slug,
        first_seen_at=application.first_seen_at,
        metrics=schemas.TopologyMetrics(
            total_assets=len(assets),
            total_findings=sum(int(finding_counts.get(asset.asset_id, 0)) for asset in assets),
        ),
        assets=[
            to_asset_summary(asset, finding_count=int(finding_counts.get(asset.asset_id, 0)))
            for asset in assets
        ],
    )


@router.get("/assets", response_model=schemas.PaginatedAssets)
def get_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    business_unit: str | None = Query(None),
    business_service: str | None = Query(None),
    application: str | None = Query(None),
    db: Session = Depends(get_db),
):
    topology_ready = _has_topology_schema(db)
    query = _apply_asset_filters(
        _asset_query_with_topology(db),
        topology_ready=topology_ready,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
    )
    count_query = _apply_asset_filters(
        db.query(func.count(func.distinct(models.Asset.asset_id))),
        topology_ready=topology_ready,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
    )

    total = count_query.scalar() or 0
    if total == 0:
        return schemas.PaginatedAssets(items=[], total=0, page=page, page_size=page_size)

    offset = (page - 1) * page_size
    assets = (
        query.order_by(func.lower(func.coalesce(models.Asset.hostname, models.Asset.asset_id)))
        .offset(offset)
        .limit(page_size)
        .all()
    )
    finding_counts = _finding_counts_for_asset_ids(db, [asset.asset_id for asset in assets])
    return schemas.PaginatedAssets(
        items=[
            to_asset_summary(asset, finding_count=int(finding_counts.get(asset.asset_id, 0)))
            for asset in assets
        ],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.get("/assets/{asset_id}", response_model=schemas.AssetDetail)
def get_asset_detail(asset_id: str, db: Session = Depends(get_db)):
    asset = (
        _asset_query_with_topology(db)
        .filter(models.Asset.asset_id == asset_id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    finding_count = (
        db.query(func.count(models.Finding.id))
        .filter(models.Finding.asset_id == asset.asset_id)
        .scalar()
        or 0
    )
    detail = asset_detail_service.get_detail(asset)
    return to_asset_detail(asset, finding_count=int(finding_count), detail=detail)


@router.get("/assets/{asset_id}/findings", response_model=schemas.AssetFindingsPage)
def get_asset_findings(asset_id: str, db: Session = Depends(get_db)):
    asset = (
        _asset_query_with_topology(db)
        .filter(models.Asset.asset_id == asset_id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    findings = (
        db.query(models.Finding)
        .options(joinedload(models.Finding.asset))
        .filter(models.Finding.asset_id == asset.asset_id)
        .order_by(models.Finding.brinqa_risk_score.desc(), models.Finding.id.desc())
        .all()
    )
    return schemas.AssetFindingsPage(
        asset=to_asset_summary(asset, finding_count=len(findings)),
        items=[to_finding_summary(finding) for finding in findings],
        total=len(findings),
    )

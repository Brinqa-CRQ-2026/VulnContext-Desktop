"""Business-unit-first topology and asset drill-down routes."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import case, func, inspect, or_
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api.common import (
    display_score_expression,
    normalize_risk_band,
    resolve_sorting,
    to_asset_enrichment,
    summary_band_filter,
    to_asset_detail,
    to_asset_summary,
    to_finding_summary,
)
from app.core.db import get_db
from app.services.brinqa_detail import BrinqaAuthContext, asset_detail_service

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
    status: str | None = None,
    environment: str | None = None,
    compliance: str | None = None,
    search: str | None = None,
    direct_only: bool = False,
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
    if status is not None and status.strip():
        query = query.filter(models.Asset.status == status.strip())
    if environment is not None and environment.strip():
        environment_value = environment.strip().lower()
        if environment_value == "unknown":
            query = query.filter(
                or_(
                    models.Asset.environment.is_(None),
                    models.Asset.environment == "",
                )
            )
        else:
            query = query.filter(func.lower(func.coalesce(models.Asset.environment, "")) == environment_value)
    if compliance is not None and compliance.strip():
        compliance_value = compliance.strip().lower()
        if compliance_value == "pci":
            query = query.filter(models.Asset.pci.is_(True))
        elif compliance_value == "pii":
            query = query.filter(models.Asset.pii.is_(True))
        elif compliance_value == "regulated":
            query = query.filter(
                or_(
                    models.Asset.pci.is_(True),
                    models.Asset.pii.is_(True),
                    models.Asset.compliance_flags.is_not(None),
                )
            )
    if search is not None and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Asset.asset_id.ilike(term),
                models.Asset.hostname.ilike(term),
                models.Asset.device_type.ilike(term),
                models.Asset.category.ilike(term),
                models.Asset.environment.ilike(term),
            )
        )
    if direct_only:
        query = query.filter(
            or_(
                models.Asset.application_id.is_(None),
                models.Asset.application.is_(None),
                models.Asset.application == "",
            )
        )
    return query


def _sort_assets(assets: list[models.Asset], finding_counts: dict[str, int], sort_by: str, sort_order: str):
    sort_by_key = sort_by.strip().lower()
    reverse = sort_order.strip().lower() == "desc"

    def asset_name(asset: models.Asset) -> str:
        return (asset.hostname or asset.asset_id or "").lower()

    key_map = {
        "name": lambda asset: asset_name(asset),
        "asset_type": lambda asset: (asset.device_type or asset.category or "").lower(),
        "asset_criticality": lambda asset: asset.crq_asset_context_score if asset.crq_asset_context_score is not None else -1,
        "status": lambda asset: (asset.status or "").lower(),
        "finding_count": lambda asset: finding_counts.get(asset.asset_id, 0),
    }
    key_fn = key_map.get(sort_by_key)
    if key_fn is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid asset sort_by. Use one of: name, asset_type, asset_criticality, status, finding_count.",
        )
    return sorted(
        assets,
        key=lambda asset: (key_fn(asset), asset_name(asset), asset.asset_id),
        reverse=reverse,
    )


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


def _parse_business_criticality(label: str | None) -> tuple[int | None, str | None]:
    if not label:
        return None, None

    match = re.match(r"^\s*(\d+)\s*[-:]\s*(.+?)\s*$", label)
    if match:
        return int(match.group(1)), match.group(2).strip().title()

    return None, label.strip().title()


def _get_business_service_or_404(
    db: Session, business_unit_slug: str, business_service_slug: str
) -> models.BusinessService:
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
    return business_service


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
    business_service = _get_business_service_or_404(
        db, business_unit_slug, business_service_slug
    )

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
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics",
    response_model=schemas.BusinessServiceAnalytics,
)
def get_business_service_analytics(
    business_unit_slug: str,
    business_service_slug: str,
    db: Session = Depends(get_db),
):
    _require_topology_schema(db)
    business_service = _get_business_service_or_404(
        db, business_unit_slug, business_service_slug
    )

    service_assets = (
        _asset_query_with_topology(db)
        .filter(models.Asset.business_service_id == business_service.id)
        .all()
    )
    applications = sorted(business_service.applications, key=lambda item: item.name.lower())
    all_finding_counts = _finding_counts_for_asset_ids(
        db, [asset.asset_id for asset in service_assets]
    )
    business_criticality_score, business_criticality_label = _parse_business_criticality(
        business_service.criticality_label
    )

    return schemas.BusinessServiceAnalytics(
        service_risk_score=None,
        service_risk_label=None,
        business_criticality_score=business_criticality_score,
        business_criticality_max=5,
        business_criticality_label=business_criticality_label,
        totals=schemas.BusinessServiceAnalyticsTotals(
            applications=len(applications),
            assets=len(service_assets),
            findings=sum(
                int(all_finding_counts.get(asset.asset_id, 0)) for asset in service_assets
            ),
        ),
        asset_criticality_distribution=_build_asset_score_distribution(
            [asset.crq_asset_context_score for asset in service_assets]
        ),
        asset_type_distribution=_build_asset_type_distribution(service_assets, limit=5),
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
    status: str | None = Query(None),
    environment: str | None = Query(None),
    compliance: str | None = Query(None),
    search: str | None = Query(None),
    direct_only: bool = Query(False),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    topology_ready = _has_topology_schema(db)
    query = _apply_asset_filters(
        _asset_query_with_topology(db),
        topology_ready=topology_ready,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
    )

    assets = query.all()
    finding_counts = _finding_counts_for_asset_ids(db, [asset.asset_id for asset in assets])
    sorted_assets = _sort_assets(assets, finding_counts, sort_by, sort_order)
    total = len(sorted_assets)
    if total == 0:
        return schemas.PaginatedAssets(items=[], total=0, page=page, page_size=page_size)

    offset = (page - 1) * page_size
    page_assets = sorted_assets[offset : offset + page_size]
    return schemas.PaginatedAssets(
        items=[
            to_asset_summary(asset, finding_count=int(finding_counts.get(asset.asset_id, 0)))
            for asset in page_assets
        ],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.get("/assets/analytics", response_model=schemas.AssetAnalyticsResponse)
def get_assets_analytics(
    business_unit: str | None = Query(None),
    business_service: str | None = Query(None),
    application: str | None = Query(None),
    status: str | None = Query(None),
    environment: str | None = Query(None),
    compliance: str | None = Query(None),
    search: str | None = Query(None),
    direct_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    topology_ready = _has_topology_schema(db)
    query = _apply_asset_filters(
        _asset_query_with_topology(db),
        topology_ready=topology_ready,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
    )

    assets = query.all()
    return schemas.AssetAnalyticsResponse(
        total_assets=len(assets),
        asset_criticality_distribution=_build_asset_score_distribution(
            [asset.crq_asset_context_score for asset in assets]
        ),
        finding_risk_distribution=_build_asset_score_distribution(
            [asset.crq_asset_aggregated_finding_risk for asset in assets]
        ),
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
    return to_asset_detail(asset, finding_count=int(finding_count), detail=None)


@router.get("/assets/{asset_id}/enrichment", response_model=schemas.AssetEnrichment)
def get_asset_enrichment(
    asset_id: str,
    db: Session = Depends(get_db),
    x_brinqa_auth_token: str | None = Header(None, alias="X-Brinqa-Auth-Token"),
    x_brinqa_session_cookie: str | None = Header(None, alias="X-Brinqa-Session-Cookie"),
):
    asset = (
        _asset_query_with_topology(db)
        .filter(models.Asset.asset_id == asset_id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if x_brinqa_auth_token is None or not x_brinqa_auth_token.strip():
        return schemas.AssetEnrichment(
            asset_id=asset.asset_id,
            status="missing_token",
            reason="missing_auth_token",
        )

    detail = asset_detail_service.get_detail(
        asset,
        auth=BrinqaAuthContext(
            bearer_token=x_brinqa_auth_token.strip(),
            session_cookie=x_brinqa_session_cookie.strip() if x_brinqa_session_cookie else None,
        ),
    )
    return to_asset_enrichment(
        asset,
        detail=detail,
        status=detail.status or "upstream_error",
        reason=detail.reason or detail.error or "upstream_request_failed",
    )


@router.get("/assets/{asset_id}/findings", response_model=schemas.AssetFindingsPage)
def get_asset_findings(
    asset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    risk_band: str | None = Query(None),
    kev_only: bool = Query(False),
    source: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    asset = (
        _asset_query_with_topology(db)
        .filter(models.Asset.asset_id == asset_id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    filters, short_circuit_empty = _asset_findings_filters(
        asset_id=asset.asset_id,
        risk_band=risk_band,
        kev_only=kev_only,
        source=source,
        search=search,
    )
    if short_circuit_empty:
        return schemas.AssetFindingsPage(
            asset=to_asset_summary(asset, finding_count=0),
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    sort_primary, sort_tie_breaker = resolve_sorting(sort_by, sort_order)
    query = db.query(models.Finding).filter(*filters)
    count_query = db.query(func.count(models.Finding.id)).filter(*filters)

    total = int(count_query.scalar() or 0)
    findings = (
        query.order_by(sort_primary, sort_tie_breaker)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.AssetFindingsPage(
        asset=to_asset_summary(asset, finding_count=total),
        items=[to_finding_summary(finding, target_name=asset.hostname) for finding in findings],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/assets/{asset_id}/findings/analytics",
    response_model=schemas.AssetFindingsAnalyticsResponse,
)
def get_asset_findings_analytics(
    asset_id: str,
    risk_band: str | None = Query(None),
    kev_only: bool = Query(False),
    source: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    asset = (
        _asset_query_with_topology(db)
        .filter(models.Asset.asset_id == asset_id)
        .first()
    )
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    filters, short_circuit_empty = _asset_findings_filters(
        asset_id=asset.asset_id,
        risk_band=risk_band,
        kev_only=kev_only,
        source=source,
        search=search,
    )
    if short_circuit_empty:
        return schemas.AssetFindingsAnalyticsResponse(
            asset=_to_asset_findings_analytics_asset(asset),
            analytics=schemas.AssetFindingsAnalytics(
                total_findings=0,
                kev_findings=0,
                critical_high_findings=0,
                highest_risk_band=None,
                average_risk_score=None,
                max_risk_score=None,
                oldest_priority_age_days=None,
                risk_bands=schemas.RiskBandSummary(),
            ),
        )

    score = display_score_expression()
    band_label = case(
        (score >= 9, "Critical"),
        (score >= 7, "High"),
        (score >= 4, "Medium"),
        else_="Low",
    )
    priority_age = case(
        (
            or_(models.Finding.crq_finding_is_kev.is_(True), score >= 9),
            models.Finding.age_in_days,
        ),
        else_=None,
    )

    totals = (
        db.query(
            func.count(models.Finding.id),
            func.sum(case((models.Finding.crq_finding_is_kev.is_(True), 1), else_=0)),
            func.sum(case((score >= 7, 1), else_=0)),
            func.avg(score),
            func.max(score),
            func.max(priority_age),
        )
        .filter(*filters)
        .one()
    )
    band_rows = (
        db.query(band_label.label("band"), func.count(models.Finding.id))
        .filter(*filters)
        .group_by(band_label)
        .all()
    )
    risk_bands = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    highest_risk_band = None
    for band in ("Critical", "High", "Medium", "Low"):
        count = next((int(row[1]) for row in band_rows if row[0] == band), 0)
        risk_bands[band] = count
        if highest_risk_band is None and count > 0:
            highest_risk_band = band

    return schemas.AssetFindingsAnalyticsResponse(
        asset=_to_asset_findings_analytics_asset(asset),
        analytics=schemas.AssetFindingsAnalytics(
            total_findings=int(totals[0] or 0),
            kev_findings=int(totals[1] or 0),
            critical_high_findings=int(totals[2] or 0),
            highest_risk_band=highest_risk_band,
            average_risk_score=float(totals[3]) if totals[3] is not None else None,
            max_risk_score=float(totals[4]) if totals[4] is not None else None,
            oldest_priority_age_days=float(totals[5]) if totals[5] is not None else None,
            risk_bands=schemas.RiskBandSummary(**risk_bands),
        ),
    )

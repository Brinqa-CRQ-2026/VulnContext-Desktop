from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import case, func, or_

from app import models, schemas
from app.repositories.topology import (
    asset_by_id,
    asset_query_with_topology,
    has_topology_schema,
)
from app.services.topology.shared import (
    _asset_findings_filters,
    _build_asset_score_distribution,
    _to_asset_findings_analytics_asset,
)
from app.services.views.helpers import (
    display_score_expression,
    resolve_sorting,
    to_asset_detail,
    to_asset_summary,
    to_finding_summary,
)


def get_assets(
    *,
    page: int,
    page_size: int,
    business_unit: str | None,
    business_service: str | None,
    application: str | None,
    status: str | None,
    environment: str | None,
    compliance: str | None,
    search: str | None,
    direct_only: bool,
    sort_by: str,
    sort_order: str,
    db,
):
    assets = _filtered_assets_query(
        db,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
    ).all()

    # Apply sort order in Python to keep the service boundary small and predictable.
    def asset_name(asset: models.Asset) -> str:
        return (asset.hostname or asset.asset_id or "").lower()

    key_map = {
        "name": lambda asset: asset_name(asset),
        "asset_type": lambda asset: (asset.device_type or asset.category or "").lower(),
        "asset_criticality": lambda asset: asset.crq_asset_context_score if asset.crq_asset_context_score is not None else -1,
        "status": lambda asset: (asset.status or "").lower(),
        "finding_count": lambda asset: asset.crq_asset_finding_count or 0,
    }
    key_fn = key_map.get(sort_by.strip().lower())
    if key_fn is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid asset sort_by. Use one of: name, asset_type, asset_criticality, status, finding_count.",
        )
    reverse = sort_order.strip().lower() == "desc"
    sorted_assets = sorted(
        assets,
        key=lambda asset: (key_fn(asset), asset_name(asset), asset.asset_id),
        reverse=reverse,
    )

    total = len(sorted_assets)
    if total == 0:
        return schemas.PaginatedAssets(items=[], total=0, page=page, page_size=page_size)

    offset = (page - 1) * page_size
    page_assets = sorted_assets[offset : offset + page_size]
    return schemas.PaginatedAssets(
        items=[
            to_asset_summary(asset)
            for asset in page_assets
        ],
        total=int(total),
        page=page,
        page_size=page_size,
    )


def get_assets_analytics(
    *,
    business_unit: str | None,
    business_service: str | None,
    application: str | None,
    status: str | None,
    environment: str | None,
    compliance: str | None,
    search: str | None,
    direct_only: bool,
    db,
):
    assets = _filtered_assets_query(
        db,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
    ).all()
    return schemas.AssetAnalyticsResponse(
        total_assets=len(assets),
        asset_criticality_distribution=_build_asset_score_distribution(
            [asset.crq_asset_context_score for asset in assets]
        ),
        finding_risk_distribution=_build_asset_score_distribution(
            [asset.crq_asset_aggregated_finding_risk for asset in assets]
        ),
    )


def get_asset_detail(asset_id: str, db):
    asset = asset_by_id(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return to_asset_detail(asset, detail=None)


def get_asset_findings(
    asset_id: str,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
    risk_band: str | None,
    kev_only: bool,
    source: str | None,
    search: str | None,
    db,
):
    asset = asset_by_id(db, asset_id)
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


def get_asset_findings_analytics(
    asset_id: str,
    *,
    risk_band: str | None,
    kev_only: bool,
    source: str | None,
    search: str | None,
    db,
):
    asset = asset_by_id(db, asset_id)
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


def _filtered_assets_query(
    db,
    *,
    business_unit: str | None,
    business_service: str | None,
    application: str | None,
    status: str | None,
    environment: str | None,
    compliance: str | None,
    search: str | None,
    direct_only: bool,
):
    topology_ready = has_topology_schema(db)
    query = asset_query_with_topology(db)
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

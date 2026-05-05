"""Thin API wrappers for the topology and asset drill-down surface."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app import schemas
from app.core.db import get_db
from app.repositories.topology import has_topology_schema as _repo_has_topology_schema
from app.services.brinqa_detail import BrinqaAuthContext, asset_detail_service
from app.services.topology_view import (
    get_application_detail as _get_application_detail,
    get_asset_detail as _get_asset_detail,
    get_asset_enrichment as _get_asset_enrichment,
    get_asset_findings as _get_asset_findings,
    get_asset_findings_analytics as _get_asset_findings_analytics,
    get_assets as _get_assets,
    get_assets_analytics as _get_assets_analytics,
    get_business_service_analytics as _get_business_service_analytics,
    get_business_service_detail as _get_business_service_detail,
    get_business_unit_detail as _get_business_unit_detail,
    get_business_units as _get_business_units,
)

router = APIRouter(tags=["topology"])


def _has_topology_schema(db):
    return _repo_has_topology_schema(db)


@router.get("/topology/business-units", response_model=list[schemas.BusinessUnitSummary])
def get_business_units(db=Depends(get_db)):
    if not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Normalized topology tables are not initialized. "
                "Apply docs/backend/topology-seed/topology-expansion.sql before using "
                "business-unit topology routes."
            ),
        )
    return _get_business_units(db)


@router.get("/topology/business-units/{business_unit_slug}", response_model=schemas.BusinessUnitDetail)
def get_business_unit_detail(business_unit_slug: str, db=Depends(get_db)):
    if not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Normalized topology tables are not initialized. "
                "Apply docs/backend/topology-seed/topology-expansion.sql before using "
                "business-unit topology routes."
            ),
        )
    return _get_business_unit_detail(business_unit_slug, db)


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}",
    response_model=schemas.BusinessServiceDetail,
)
def get_business_service_detail(
    business_unit_slug: str,
    business_service_slug: str,
    db=Depends(get_db),
):
    if not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Normalized topology tables are not initialized. "
                "Apply docs/backend/topology-seed/topology-expansion.sql before using "
                "business-unit topology routes."
            ),
        )
    return _get_business_service_detail(business_unit_slug, business_service_slug, db)


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics",
    response_model=schemas.BusinessServiceAnalytics,
)
def get_business_service_analytics(
    business_unit_slug: str,
    business_service_slug: str,
    db=Depends(get_db),
):
    if not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Normalized topology tables are not initialized. "
                "Apply docs/backend/topology-seed/topology-expansion.sql before using "
                "business-unit topology routes."
            ),
        )
    return _get_business_service_analytics(business_unit_slug, business_service_slug, db)


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}",
    response_model=schemas.ApplicationDetail,
)
def get_application_detail(
    business_unit_slug: str,
    business_service_slug: str,
    application_slug: str,
    db=Depends(get_db),
):
    if not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "Normalized topology tables are not initialized. "
                "Apply docs/backend/topology-seed/topology-expansion.sql before using "
                "business-unit topology routes."
            ),
        )
    return _get_application_detail(business_unit_slug, business_service_slug, application_slug, db)


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
    db=Depends(get_db),
):
    if business_unit is not None and not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "The business_unit filter requires the normalized topology schema. "
                "Apply docs/backend/topology-seed/topology-expansion.sql first."
            ),
        )
    return _get_assets(
        page=page,
        page_size=page_size,
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
        sort_by=sort_by,
        sort_order=sort_order,
        db=db,
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
    db=Depends(get_db),
):
    if business_unit is not None and not _has_topology_schema(db):
        raise HTTPException(
            status_code=503,
            detail=(
                "The business_unit filter requires the normalized topology schema. "
                "Apply docs/backend/topology-seed/topology-expansion.sql first."
            ),
        )
    return _get_assets_analytics(
        business_unit=business_unit,
        business_service=business_service,
        application=application,
        status=status,
        environment=environment,
        compliance=compliance,
        search=search,
        direct_only=direct_only,
        db=db,
    )


@router.get("/assets/{asset_id}", response_model=schemas.AssetDetail)
def get_asset_detail(asset_id: str, db=Depends(get_db)):
    return _get_asset_detail(asset_id, db)


@router.get("/assets/{asset_id}/enrichment", response_model=schemas.AssetEnrichment)
def get_asset_enrichment(
    asset_id: str,
    db=Depends(get_db),
    x_brinqa_auth_token: str | None = Header(None, alias="X-Brinqa-Auth-Token"),
    x_brinqa_session_cookie: str | None = Header(None, alias="X-Brinqa-Session-Cookie"),
):
    return _get_asset_enrichment(
        asset_id,
        db,
        x_brinqa_auth_token=x_brinqa_auth_token,
        x_brinqa_session_cookie=x_brinqa_session_cookie,
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
    db=Depends(get_db),
):
    return _get_asset_findings(
        asset_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        risk_band=risk_band,
        kev_only=kev_only,
        source=source,
        search=search,
        db=db,
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
    db=Depends(get_db),
):
    return _get_asset_findings_analytics(
        asset_id,
        risk_band=risk_band,
        kev_only=kev_only,
        source=source,
        search=search,
        db=db,
    )

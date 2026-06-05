from fastapi import APIRouter, Depends, Query

from app import schemas
from app.api.topology.dependencies import require_business_unit_filter_schema
from app.core.db import get_db
from app.services.topology import (
    get_asset_detail as _get_asset_detail,
    get_asset_findings as _get_asset_findings,
    get_asset_findings_analytics as _get_asset_findings_analytics,
    get_assets as _get_assets,
    get_assets_analytics as _get_assets_analytics,
)

router = APIRouter()


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
    if business_unit is not None:
        require_business_unit_filter_schema(db)
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
    if business_unit is not None:
        require_business_unit_filter_schema(db)
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

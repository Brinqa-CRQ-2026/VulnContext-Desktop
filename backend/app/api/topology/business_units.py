from fastapi import APIRouter, Depends, Query

from app import schemas
from app.api.topology.dependencies import require_topology_schema
from app.core.db import get_db
from app.services.topology_view import (
    get_business_unit_detail as _get_business_unit_detail,
    get_business_unit_findings as _get_business_unit_findings,
    get_business_unit_risk_overview as _get_business_unit_risk_overview,
    get_business_units as _get_business_units,
)

router = APIRouter()


@router.get("/topology/business-units", response_model=list[schemas.BusinessUnitSummary])
def get_business_units(db=Depends(get_db)):
    require_topology_schema(db)
    return _get_business_units(db)


@router.get("/topology/business-units/{business_unit_slug}", response_model=schemas.BusinessUnitDetail)
def get_business_unit_detail(business_unit_slug: str, db=Depends(get_db)):
    require_topology_schema(db)
    return _get_business_unit_detail(business_unit_slug, db)


@router.get(
    "/topology/business-units/{business_unit_slug}/risk-overview",
    response_model=schemas.BusinessUnitRiskOverview,
)
def get_business_unit_risk_overview(business_unit_slug: str, db=Depends(get_db)):
    require_topology_schema(db)
    return _get_business_unit_risk_overview(business_unit_slug, db)


@router.get(
    "/topology/business-units/{business_unit_slug}/findings",
    response_model=schemas.PaginatedFindings,
)
def get_business_unit_findings(
    business_unit_slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    source: str | None = Query(None),
    risk_band: str | None = Query(None),
    search: str | None = Query(None),
    db=Depends(get_db),
):
    require_topology_schema(db)
    return _get_business_unit_findings(
        business_unit_slug,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        source=source,
        risk_band=risk_band,
        search=search,
        db=db,
    )

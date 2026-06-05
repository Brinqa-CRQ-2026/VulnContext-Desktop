from fastapi import APIRouter, Depends

from app import schemas
from app.api.topology.dependencies import require_topology_schema
from app.core.db import get_db
from app.services.topology_view import (
    get_business_service_analytics as _get_business_service_analytics,
    get_business_service_detail as _get_business_service_detail,
)

router = APIRouter()


@router.get(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}",
    response_model=schemas.BusinessServiceDetail,
)
def get_business_service_detail(
    business_unit_slug: str,
    business_service_slug: str,
    db=Depends(get_db),
):
    require_topology_schema(db)
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
    require_topology_schema(db)
    return _get_business_service_analytics(business_unit_slug, business_service_slug, db)

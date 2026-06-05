from fastapi import APIRouter, Depends

from app import schemas
from app.api.topology.dependencies import require_topology_schema
from app.core.db import get_db
from app.services.topology_view import get_application_detail as _get_application_detail

router = APIRouter()


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
    require_topology_schema(db)
    return _get_application_detail(business_unit_slug, business_service_slug, application_slug, db)

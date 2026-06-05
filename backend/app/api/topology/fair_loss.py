from fastapi import APIRouter, Depends

from app import schemas
from app.api.topology.dependencies import require_topology_schema
from app.core.db import get_db
from app.services.fair.loss_prediction import LossPredictionInputs
from app.services.fair.scope_loss_prediction import FairScopeLossPredictionService

router = APIRouter()
fair_scope_loss_prediction_service = FairScopeLossPredictionService()


@router.post(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss",
    response_model=schemas.FairLossPredictionResponse,
)
def predict_business_service_fair_loss(
    business_unit_slug: str,
    business_service_slug: str,
    payload: schemas.FairLossPredictionRequest,
    db=Depends(get_db),
):
    require_topology_schema(db, route_group="business service FAIR routes")
    return fair_scope_loss_prediction_service.simulate_business_service(
        db,
        business_unit_slug,
        business_service_slug,
        LossPredictionInputs(
            control_context=payload.control_context,
            primary_loss_mean=payload.primary_loss_mean,
            secondary_loss_mean=payload.secondary_loss_mean,
            iterations=payload.iterations,
        ),
    )


@router.post(
    "/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss",
    response_model=schemas.FairLossPredictionResponse,
)
def predict_application_fair_loss(
    business_unit_slug: str,
    business_service_slug: str,
    application_slug: str,
    payload: schemas.FairLossPredictionRequest,
    db=Depends(get_db),
):
    require_topology_schema(db, route_group="application FAIR routes")
    return fair_scope_loss_prediction_service.simulate_application(
        db,
        business_unit_slug,
        business_service_slug,
        application_slug,
        LossPredictionInputs(
            control_context=payload.control_context,
            primary_loss_mean=payload.primary_loss_mean,
            secondary_loss_mean=payload.secondary_loss_mean,
            iterations=payload.iterations,
        ),
    )


@router.post("/assets/{asset_id}/fair-loss", response_model=schemas.FairLossPredictionResponse)
def predict_asset_fair_loss(
    asset_id: str,
    payload: schemas.FairLossPredictionRequest,
    db=Depends(get_db),
):
    return fair_scope_loss_prediction_service.simulate_asset(
        db,
        asset_id,
        LossPredictionInputs(
            control_context=payload.control_context,
            primary_loss_mean=payload.primary_loss_mean,
            secondary_loss_mean=payload.secondary_loss_mean,
            iterations=payload.iterations,
        ),
    )

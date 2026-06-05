from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app import schemas
from app.core.db import get_db
from app.repositories import findings as findings_repo
from app.services.fair.loss_prediction import (
    FairLossPredictionService,
    LossPredictionInputs,
)
from app.services.views.findings import (
    get_finding_detail as _get_finding_detail,
    get_findings_summary as _get_findings_summary,
    list_findings as _list_findings,
    list_top_findings as _list_top_findings,
)

router = APIRouter(tags=["findings"])
fair_loss_prediction_service = FairLossPredictionService()


@router.get("/findings/top", response_model=List[schemas.FindingSummary])
def get_top_findings(db=Depends(get_db)):
    return _list_top_findings(db)


@router.get("/findings/summary", response_model=schemas.ScoresSummary)
def get_scores_summary(db=Depends(get_db)):
    return _get_findings_summary(db)


@router.get("/findings", response_model=schemas.PaginatedFindings)
def get_findings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    source: str | None = Query(None),
    risk_band: str | None = Query(None),
    db=Depends(get_db),
):
    return _list_findings(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        source=source,
        risk_band=risk_band,
    )


@router.get("/findings/{finding_id}", response_model=schemas.FindingDetail)
def get_finding_by_id(finding_id: str, db=Depends(get_db)):
    return _get_finding_detail(db, finding_id)


@router.post(
    "/findings/{finding_id}/fair-loss",
    response_model=schemas.FairLossPredictionResponse,
)
def predict_finding_fair_loss(
    finding_id: str,
    payload: schemas.FairLossPredictionRequest,
    db=Depends(get_db),
):
    finding = findings_repo.get_finding_by_id(db, finding_id, include_asset=True)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    return fair_loss_prediction_service.simulate(
        finding,
        LossPredictionInputs(
            control_context=payload.control_context,
            primary_loss_mean=payload.primary_loss_mean,
            secondary_loss_mean=payload.secondary_loss_mean,
            iterations=payload.iterations,
        ),
    )


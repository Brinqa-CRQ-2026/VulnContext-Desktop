from typing import List

from fastapi import APIRouter, Depends, Query

from app import schemas
from app.core.db import get_db
from app.services.brinqa_detail import finding_detail_service
from app.services.findings_view import (
    get_finding_detail as _get_finding_detail,
    get_finding_enrichment as _get_finding_enrichment,
    get_findings_summary as _get_findings_summary,
    list_findings as _list_findings,
    list_top_findings as _list_top_findings,
)

router = APIRouter(tags=["findings"])


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


@router.get("/findings/{finding_id}/enrichment", response_model=schemas.FindingEnrichment)
def get_finding_enrichment(finding_id: str, db=Depends(get_db)):
    return _get_finding_enrichment(db, finding_id)


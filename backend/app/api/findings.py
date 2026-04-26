from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api.common import (
    display_score_expression,
    derive_risk_band,
    normalize_risk_band,
    resolve_sorting,
    summary_band_filter,
    _parse_datetime,
    to_finding_detail,
    to_finding_summary,
)
from app.core.db import get_db
from app.services.brinqa_detail import finding_detail_service

router = APIRouter(tags=["findings"])


@router.get("/findings/top", response_model=List[schemas.FindingSummary])
def get_top_findings(db: Session = Depends(get_db)):
    findings = (
        db.query(models.Finding)
        .options(joinedload(models.Finding.asset))
        .order_by(display_score_expression().desc(), models.Finding.id.desc())
        .limit(10)
        .all()
    )
    return [to_finding_summary(finding) for finding in findings]


@router.get("/findings/summary", response_model=schemas.ScoresSummary)
def get_scores_summary(db: Session = Depends(get_db)):
    findings = (
        db.query(
            models.Finding.id,
            models.Finding.crq_score,
            models.Finding.brinqa_risk_score,
            models.Finding.crq_is_kev,
        )
        .all()
    )
    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    kev_band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    kev_total = 0
    for _, crq_score, brinqa_risk_score, crq_is_kev in findings:
        score = crq_score if crq_score is not None else brinqa_risk_score
        band = derive_risk_band(score)
        if band in band_counts:
            band_counts[band] += 1
            if crq_is_kev:
                kev_band_counts[band] += 1
        if crq_is_kev:
            kev_total += 1

    return schemas.ScoresSummary(
        total_findings=len(findings),
        risk_bands=schemas.RiskBandSummary(**band_counts),
        kev_findings_total=kev_total,
        kev_risk_bands=schemas.RiskBandSummary(**kev_band_counts),
    )


@router.get("/findings", response_model=schemas.PaginatedFindings)
def get_findings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    source: str | None = Query(None),
    risk_band: str | None = Query(None),
    db: Session = Depends(get_db),
):
    sort_primary, sort_tie_breaker = resolve_sorting(sort_by, sort_order)
    query = db.query(models.Finding).options(joinedload(models.Finding.asset))
    count_query = db.query(func.count(models.Finding.id))

    if source is not None and source.strip() and source.strip().lower() != "brinqa":
        return schemas.PaginatedFindings(items=[], total=0, page=page, page_size=page_size)

    if risk_band is not None:
        band_filter = summary_band_filter(normalize_risk_band(risk_band))
        query = query.filter(band_filter)
        count_query = count_query.filter(band_filter)

    total = count_query.scalar() or 0
    if total == 0:
        return schemas.PaginatedFindings(items=[], total=0, page=page, page_size=page_size)

    offset = (page - 1) * page_size
    findings = (
        query.order_by(sort_primary, sort_tie_breaker)
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return schemas.PaginatedFindings(
        items=[to_finding_summary(finding) for finding in findings],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/findings/{finding_id}", response_model=schemas.FindingDetail)
def get_finding_by_id(finding_id: str, db: Session = Depends(get_db)):
    finding = (
        db.query(models.Finding)
        .options(joinedload(models.Finding.asset))
        .filter(models.Finding.finding_id == finding_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    return to_finding_detail(finding, detail=None)


@router.get("/findings/{finding_id}/enrichment", response_model=schemas.FindingEnrichment)
def get_finding_enrichment(finding_id: str, db: Session = Depends(get_db)):
    finding = (
        db.query(models.Finding)
        .filter(models.Finding.finding_id == finding_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    detail = finding_detail_service.get_detail(db, finding)
    payload = detail.payload or {}
    return schemas.FindingEnrichment(
        finding_id=finding.finding_id,
        summary=payload.get("summary"),
        description=payload.get("description"),
        record_link=payload.get("record_link"),
        source_status=payload.get("source_status"),
        severity=payload.get("severity"),
        due_date=_parse_datetime(payload.get("due_date")),
        attack_pattern_names=payload.get("attack_pattern_names"),
        attack_technique_names=payload.get("attack_technique_names"),
        attack_tactic_names=payload.get("attack_tactic_names"),
        risk_owner_name=payload.get("risk_owner_name"),
        remediation_owner_name=payload.get("remediation_owner_name"),
        remediation_status=payload.get("remediation_status"),
        detail_source=detail.source,
        detail_fetched_at=detail.fetched_at,
    )

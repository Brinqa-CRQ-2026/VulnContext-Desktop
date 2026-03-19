from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.common import (
    apply_source_filter,
    normalize_disposition,
    normalize_risk_band,
    record_finding_event,
    resolve_sorting,
    to_disposition_result,
    to_scored_finding_out,
)
from app.core.db import get_db

router = APIRouter(tags=["findings"])


@router.get("/findings/top", response_model=List[schemas.ScoredFindingOut])
def get_top_10_scores(db: Session = Depends(get_db)):
    findings = (
        db.query(models.ScoredFinding)
        .order_by(
            func.coalesce(
                models.ScoredFinding.internal_risk_score,
                models.ScoredFinding.risk_score,
            ).desc(),
            models.ScoredFinding.id.desc(),
        )
        .limit(10)
        .all()
    )
    return [to_scored_finding_out(finding) for finding in findings]


@router.get("/findings/summary", response_model=schemas.ScoresSummary)
def get_scores_summary(db: Session = Depends(get_db)):
    total = db.query(func.count(models.ScoredFinding.id)).scalar() or 0

    display_band = func.coalesce(
        models.ScoredFinding.internal_risk_band,
        models.ScoredFinding.risk_band,
        models.ScoredFinding.risk_rating,
    )
    rows = (
        db.query(display_band, func.count(models.ScoredFinding.id))
        .group_by(display_band)
        .all()
    )
    kev_rows = (
        db.query(display_band, func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.is_kev.is_(True))
        .group_by(display_band)
        .all()
    )
    kev_total = (
        db.query(func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.is_kev.is_(True))
        .scalar()
        or 0
    )

    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for band, count in rows:
        if band in band_counts:
            band_counts[band] = count
    kev_band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for band, count in kev_rows:
        if band in kev_band_counts:
            kev_band_counts[band] = count

    return schemas.ScoresSummary(
        total_findings=total,
        risk_bands=schemas.RiskBandSummary(
            Critical=band_counts["Critical"],
            High=band_counts["High"],
            Medium=band_counts["Medium"],
            Low=band_counts["Low"],
        ),
        kev_findings_total=int(kev_total),
        kev_risk_bands=schemas.RiskBandSummary(
            Critical=kev_band_counts["Critical"],
            High=kev_band_counts["High"],
            Medium=kev_band_counts["Medium"],
            Low=kev_band_counts["Low"],
        ),
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
    normalized_band = normalize_risk_band(risk_band) if risk_band is not None else None

    count_query = db.query(func.count(models.ScoredFinding.id))
    items_query = db.query(models.ScoredFinding)

    if normalized_band is not None:
        band_filter = (
            func.coalesce(
                models.ScoredFinding.internal_risk_band,
                models.ScoredFinding.risk_band,
                models.ScoredFinding.risk_rating,
            ) == normalized_band
        )
        count_query = count_query.filter(band_filter)
        items_query = items_query.filter(band_filter)

    total = apply_source_filter(count_query, source).scalar() or 0

    if total == 0:
        return schemas.PaginatedFindings(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    offset = (page - 1) * page_size
    items_query = apply_source_filter(items_query, source)
    items = (
        items_query.order_by(sort_primary, sort_tie_breaker)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return schemas.PaginatedFindings(
        items=[to_scored_finding_out(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/findings/{finding_db_id}", response_model=schemas.ScoredFindingOut)
def get_finding_by_id(finding_db_id: int, db: Session = Depends(get_db)):
    finding = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.id == finding_db_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    cve_description = None
    if finding.cve_id:
        cache_row = (
            db.query(models.NvdCveCache.description)
            .filter(models.NvdCveCache.cve_id == finding.cve_id)
            .first()
        )
        if cache_row:
            cve_description = cache_row[0]

    return to_scored_finding_out(finding, cve_description=cve_description)


@router.post(
    "/findings/{finding_db_id}/disposition",
    response_model=schemas.FindingDispositionResult,
)
def set_finding_disposition(
    finding_db_id: int,
    payload: schemas.FindingDispositionUpdateRequest,
    db: Session = Depends(get_db),
):
    finding = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.id == finding_db_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    disposition = normalize_disposition(payload.disposition)
    if disposition == "none":
        raise HTTPException(
            status_code=400,
            detail="Use the clear disposition endpoint to reset a finding to none.",
        )

    old_value = {
        "disposition": finding.disposition or "none",
        "disposition_state": finding.disposition_state,
        "disposition_reason": finding.disposition_reason,
        "disposition_comment": finding.disposition_comment,
        "disposition_expires_at": finding.disposition_expires_at,
        "disposition_created_by": finding.disposition_created_by,
    }

    now = datetime.utcnow()
    finding.disposition = disposition
    finding.disposition_state = "active"
    finding.disposition_reason = (payload.reason or "").strip() or None
    finding.disposition_comment = (payload.comment or "").strip() or None
    finding.disposition_expires_at = payload.expires_at
    finding.disposition_created_at = now
    finding.disposition_created_by = (payload.actor or "manual").strip() or "manual"

    record_finding_event(
        db,
        finding=finding,
        event_type="disposition_changed",
        actor=finding.disposition_created_by or "manual",
        old_value=old_value,
        new_value={
            "disposition": finding.disposition,
            "disposition_state": finding.disposition_state,
            "disposition_reason": finding.disposition_reason,
            "disposition_comment": finding.disposition_comment,
            "disposition_expires_at": finding.disposition_expires_at,
            "disposition_created_by": finding.disposition_created_by,
        },
    )

    db.commit()
    db.refresh(finding)
    return to_disposition_result(finding)


@router.post(
    "/findings/{finding_db_id}/disposition/clear",
    response_model=schemas.FindingDispositionResult,
)
def clear_finding_disposition(
    finding_db_id: int,
    actor: str | None = Query(None),
    db: Session = Depends(get_db),
):
    finding = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.id == finding_db_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    old_value = {
        "disposition": finding.disposition or "none",
        "disposition_state": finding.disposition_state,
        "disposition_reason": finding.disposition_reason,
        "disposition_comment": finding.disposition_comment,
        "disposition_expires_at": finding.disposition_expires_at,
        "disposition_created_by": finding.disposition_created_by,
    }

    finding.disposition = "none"
    finding.disposition_state = None
    finding.disposition_reason = None
    finding.disposition_comment = None
    finding.disposition_created_at = None
    finding.disposition_expires_at = None
    finding.disposition_created_by = None

    record_finding_event(
        db,
        finding=finding,
        event_type="disposition_changed",
        actor=(actor or "manual").strip() or "manual",
        old_value=old_value,
        new_value={"disposition": "none"},
    )

    db.commit()
    db.refresh(finding)
    return to_disposition_result(finding)

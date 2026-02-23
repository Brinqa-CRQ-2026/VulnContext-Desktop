from typing import List
from datetime import datetime, timedelta, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.core.db import get_db
from app.scoring import score_finding_dict

router = APIRouter(
    prefix="/scores",
    tags=["scores"],
)


@router.get("/health", summary="Health check for scores API")
def health_check():
    return {"status": "ok"}


@router.get("/", response_model=List[schemas.ScoredFindingOut])
def get_scores(db: Session = Depends(get_db)):
    """
    Return ALL scored findings currently stored in the database.
    """
    findings = db.query(models.ScoredFinding).all()
    return findings


@router.get("/top10", response_model=List[schemas.ScoredFindingOut])
def get_top_10_scores(db: Session = Depends(get_db)):
    """
    Return the top 10 findings by risk_score (descending).

    This maps directly to the "Top 10 by Context-Aware Risk" table
    in the frontend dashboard.
    """
    findings = (
        db.query(models.ScoredFinding)
        .order_by(models.ScoredFinding.risk_score.desc())
        .limit(10)
        .all()
    )
    return findings


@router.post("/", response_model=schemas.ScoredFindingOut)
def create_scored_finding(
    finding_in: schemas.ScoredFindingCreate,
    db: Session = Depends(get_db),
):
    """
    Score a single finding and persist it.

    Flow:
    - Take raw finding fields (no risk_score/band).
    - Compute risk_score + risk_band via score_finding_dict.
    - Insert into SQLite.
    - Return the created row.
    """
    scored_dict = score_finding_dict(finding_in.dict())

    db_obj = models.ScoredFinding(**scored_dict)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return db_obj

@router.get("/summary", response_model=schemas.ScoresSummary)
def get_scores_summary(db: Session = Depends(get_db)):
    """
    Summary statistics over *all* scored findings:
      - total number of findings
      - counts by risk band (Critical/High/Medium/Low)
    """
    total = db.query(func.count(models.ScoredFinding.id)).scalar() or 0

    rows = (
        db.query(models.ScoredFinding.risk_band, func.count(models.ScoredFinding.id))
        .group_by(models.ScoredFinding.risk_band)
        .all()
    )

    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for band, count in rows:
        if band in band_counts:
            band_counts[band] = count

    return schemas.ScoresSummary(
        total_findings=total,
        risk_bands=schemas.RiskBandSummary(
            Critical=band_counts["Critical"],
            High=band_counts["High"],
            Medium=band_counts["Medium"],
            Low=band_counts["Low"],
        ),
    )

@router.get("/all", response_model=schemas.PaginatedFindings)
def get_all_scores(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Return all scored findings, paginated and sorted by risk_score DESC.
    """

    total = db.query(func.count(models.ScoredFinding.id)).scalar() or 0

    # If there are no rows, return empty page 1
    if total == 0:
        return schemas.PaginatedFindings(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    offset = (page - 1) * page_size

    items = (
        db.query(models.ScoredFinding)
        .order_by(models.ScoredFinding.risk_score.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return schemas.PaginatedFindings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{finding_id}/resolve", response_model=schemas.ScoredFindingOut)
def mark_finding_resolved(
    finding_id: int,
    resolved: bool = True,
    update: schemas.ResolveFindingUpdate | None = None,
    db: Session = Depends(get_db),
):
    """
    Mark a finding as resolved or unresolved.
    
    - finding_id: The database ID of the finding
    - resolved: True to mark as resolved, False to mark as unresolved
    """
    finding = db.query(models.ScoredFinding).filter(
        models.ScoredFinding.id == finding_id
    ).first()
    
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    resolved_value = resolved
    resolved_at_value = None

    if update is not None:
        if update.resolved is not None:
            resolved_value = update.resolved
        resolved_at_value = update.resolved_at

    if resolved_value:
        if resolved_at_value is None:
            resolved_at_value = datetime.utcnow()
    else:
        resolved_at_value = None

    finding.resolved = resolved_value
    finding.resolved_at = resolved_at_value
    db.commit()
    db.refresh(finding)
    
    return finding


@router.get("/risk-over-time", response_model=schemas.RiskOverTime)
def get_risk_over_time(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """
    Time series showing total remaining risk declining over time as findings are resolved.
    Returns one point per day with the cumulative total risk of all unresolved findings.
    """
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)

    # Get total risk at the start (before any resolutions in the time window)
    initial_total = db.query(
        func.coalesce(func.sum(models.ScoredFinding.risk_score), 0.0)
    ).filter(
        (models.ScoredFinding.resolved == False) | 
        (models.ScoredFinding.resolved_at.is_(None)) |
        (models.ScoredFinding.resolved_at >= start_dt)
    ).scalar() or 0.0

    # Get resolved findings grouped by date
    rows = (
        db.query(
            func.date(models.ScoredFinding.resolved_at),
            func.count(models.ScoredFinding.id),
            func.coalesce(func.sum(models.ScoredFinding.risk_score), 0.0),
        )
        .filter(models.ScoredFinding.resolved == True)
        .filter(models.ScoredFinding.resolved_at.isnot(None))
        .filter(models.ScoredFinding.resolved_at >= start_dt)
        .filter(models.ScoredFinding.resolved_at <= end_dt)
        .group_by(func.date(models.ScoredFinding.resolved_at))
        .all()
    )

    by_date: dict[str, tuple[int, float]] = {}
    for date_value, count_value, risk_value in rows:
        key = str(date_value)
        by_date[key] = (int(count_value or 0), float(risk_value or 0.0))

    # Calculate cumulative remaining risk for each day
    points: list[schemas.RiskOverTimePoint] = []
    cumulative_total = float(initial_total)
    
    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        key = current_date.isoformat()
        count_value, risk_value = by_date.get(key, (0, 0.0))
        
        points.append(
            schemas.RiskOverTimePoint(
                date=key,
                total_risk=cumulative_total,
                resolved_count=count_value,
                resolved_risk=risk_value,
            )
        )
        
        # Subtract resolved risk for the next day
        cumulative_total -= risk_value

    return schemas.RiskOverTime(days=days, points=points)


@router.get("/assets", response_model=List[schemas.AssetVulnCount])
def get_asset_vulnerability_counts(db: Session = Depends(get_db)):
    """
    Get vulnerability counts grouped by asset for packed bubble chart.
    Returns asset_id, hostname, count of vulnerabilities, and total risk per asset.
    """
    rows = (
        db.query(
            models.ScoredFinding.asset_id,
            models.ScoredFinding.hostname,
            func.count(models.ScoredFinding.id).label("vuln_count"),
            func.coalesce(func.sum(models.ScoredFinding.risk_score), 0.0).label("total_risk"),
        )
        .filter(models.ScoredFinding.resolved == False)
        .group_by(models.ScoredFinding.asset_id, models.ScoredFinding.hostname)
        .order_by(func.count(models.ScoredFinding.id).desc())
        .all()
    )

    return [
        schemas.AssetVulnCount(
            asset_id=row.asset_id,
            hostname=row.hostname,
            vuln_count=row.vuln_count,
            total_risk=float(row.total_risk),
        )
        for row in rows
    ]
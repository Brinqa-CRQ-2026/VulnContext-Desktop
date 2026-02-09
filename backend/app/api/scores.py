from typing import List

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
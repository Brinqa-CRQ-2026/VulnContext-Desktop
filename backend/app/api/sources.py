from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.db import get_db

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=List[schemas.SourceSummary])
def get_sources_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.ScoredFinding.source,
            func.coalesce(
                models.ScoredFinding.internal_risk_band,
                models.ScoredFinding.risk_band,
                models.ScoredFinding.risk_rating,
            ),
            func.count(models.ScoredFinding.id),
        )
        .group_by(
            models.ScoredFinding.source,
            func.coalesce(
                models.ScoredFinding.internal_risk_band,
                models.ScoredFinding.risk_band,
                models.ScoredFinding.risk_rating,
            ),
        )
        .all()
    )

    source_map: dict[str, dict] = {}
    for source, risk_band, count in rows:
        key = source or "unknown"
        if key not in source_map:
            source_map[key] = {
                "total_findings": 0,
                "bands": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            }
        source_map[key]["total_findings"] += int(count)
        if risk_band in source_map[key]["bands"]:
            source_map[key]["bands"][risk_band] = int(count)

    summaries = [
        schemas.SourceSummary(
            source=source_name,
            total_findings=data["total_findings"],
            risk_bands=schemas.RiskBandSummary(**data["bands"]),
        )
        for source_name, data in source_map.items()
    ]
    summaries.sort(key=lambda item: (-item.total_findings, item.source.lower()))
    return summaries


@router.patch("/sources/{source_name}", response_model=schemas.SourceRenameResult)
def rename_source(
    source_name: str,
    payload: schemas.SourceRenameRequest,
    db: Session = Depends(get_db),
):
    old_source = source_name.strip()
    new_source = payload.new_source.strip()

    if not old_source:
        raise HTTPException(status_code=400, detail="Existing source name is required.")
    if not new_source:
        raise HTTPException(status_code=400, detail="New source name is required.")
    if len(new_source) > 80:
        raise HTTPException(status_code=400, detail="New source name must be <= 80 characters.")

    existing = (
        db.query(func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.source == old_source)
        .scalar()
        or 0
    )
    if existing == 0:
        raise HTTPException(status_code=404, detail="Source not found.")

    updated_rows = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.source == old_source)
        .update({models.ScoredFinding.source: new_source}, synchronize_session=False)
    )
    db.commit()

    return schemas.SourceRenameResult(
        old_source=old_source,
        new_source=new_source,
        updated_rows=int(updated_rows),
    )


@router.delete("/sources/{source_name}", response_model=schemas.SourceDeleteResult)
def delete_source(source_name: str, db: Session = Depends(get_db)):
    normalized_source = source_name.strip()
    if not normalized_source:
        raise HTTPException(status_code=400, detail="Source name is required.")

    deleted_rows = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.source == normalized_source)
        .delete(synchronize_session=False)
    )
    if deleted_rows == 0:
        db.rollback()
        raise HTTPException(status_code=404, detail="Source not found.")

    db.commit()
    total_remaining = db.query(func.count(models.ScoredFinding.id)).scalar() or 0
    return schemas.SourceDeleteResult(
        source=normalized_source,
        deleted_rows=int(deleted_rows),
        total_findings_remaining=int(total_remaining),
    )

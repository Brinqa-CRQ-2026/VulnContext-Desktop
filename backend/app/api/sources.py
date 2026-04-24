from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.common import derive_risk_band
from app.core.db import get_db

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[schemas.SourceSummary])
def get_sources_summary(db: Session = Depends(get_db)):
    findings = db.query(
        models.Finding.crq_score,
        models.Finding.brinqa_risk_score,
    ).all()
    bands = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for crq_score, brinqa_risk_score in findings:
        score = crq_score if crq_score is not None else brinqa_risk_score
        band = derive_risk_band(score)
        if band in bands:
            bands[band] += 1

    total = len(findings)
    if total == 0:
        return []

    return [
        schemas.SourceSummary(
            source="Brinqa",
            total_findings=total,
            risk_bands=schemas.RiskBandSummary(**bands),
        )
    ]

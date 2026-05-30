from __future__ import annotations

from sqlalchemy.orm import Session

from app import models


def get_ml_risk_feature_by_finding_id(db: Session, finding_id: str):
    return (
        db.query(models.MLRiskFeature)
        .filter(models.MLRiskFeature.finding_id == finding_id)
        .first()
    )


def upsert_ml_risk_feature(db: Session, data: dict):
    row = get_ml_risk_feature_by_finding_id(db, data["finding_id"])

    if row is None:
        row = models.MLRiskFeature(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)

    db.commit()
    db.refresh(row)

    return row
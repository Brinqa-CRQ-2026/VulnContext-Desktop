from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories.ml_risk_features import get_ml_risk_feature_by_finding_id


def get_ml_risk_for_finding(db: Session, finding_id: str):
    return get_ml_risk_feature_by_finding_id(db, finding_id)
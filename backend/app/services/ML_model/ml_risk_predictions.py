from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.ml_risk_features import get_ml_risk_feature_by_finding_id
from app.services.ML_model.ml_model_loader import get_ml_predictor


def predict_ml_risk_for_finding(db: Session, finding_id: str):
    row = get_ml_risk_feature_by_finding_id(db, finding_id)

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No ML feature row found for finding_id={finding_id}",
        )

    predictor = get_ml_predictor()
    result = predictor.predict(row)

    row.prediction_score = result["prediction_score"]
    row.prediction_route = result["prediction_route"]
    row.gate_probability = result["gate_probability"]
    row.predicted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)

    return row
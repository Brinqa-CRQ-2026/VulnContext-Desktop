from typing import Any

from app import models


def upsert_ml_risk_feature(db, data: dict[str, Any]) -> None:
    row = (
        db.query(models.MLRiskFeature)
        .filter(models.MLRiskFeature.finding_id == data["finding_id"])
        .first()
    )

    if row is None:
        db.add(models.MLRiskFeature(**data))
        return

    for key, value in data.items():
        setattr(row, key, value)
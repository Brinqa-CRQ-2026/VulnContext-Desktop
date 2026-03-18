from __future__ import annotations

from typing import TypedDict

from sqlalchemy.orm import Session

from app import models


class RiskWeights(TypedDict):
    cvss_weight: float
    epss_weight: float
    kev_weight: float
    asset_criticality_weight: float
    context_weight: float


DEFAULT_RISK_WEIGHTS: RiskWeights = {
    "cvss_weight": 0.40,
    "epss_weight": 0.25,
    "kev_weight": 0.25,
    "asset_criticality_weight": 0.15,
    "context_weight": 0.20,
}


def weights_from_config(config: models.RiskScoringConfig) -> RiskWeights:
    return {
        "cvss_weight": float(config.cvss_weight),
        "epss_weight": float(config.epss_weight),
        "kev_weight": float(config.kev_weight),
        "asset_criticality_weight": float(config.asset_criticality_weight),
        "context_weight": float(config.context_weight),
    }


def get_or_create_scoring_config(db: Session) -> models.RiskScoringConfig:
    config = db.query(models.RiskScoringConfig).order_by(models.RiskScoringConfig.id.asc()).first()
    if config:
        return config

    config = models.RiskScoringConfig(**DEFAULT_RISK_WEIGHTS)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

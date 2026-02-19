from __future__ import annotations

from typing import TypedDict

from sqlalchemy.orm import Session

from app import models


class RiskWeights(TypedDict):
    cvss_weight: float
    epss_weight: float
    internet_exposed_weight: float
    asset_criticality_weight: float
    vuln_age_weight: float
    auth_required_weight: float


DEFAULT_RISK_WEIGHTS: RiskWeights = {
    "cvss_weight": 0.30,
    "epss_weight": 0.25,
    "internet_exposed_weight": 0.20,
    "asset_criticality_weight": 0.15,
    "vuln_age_weight": 0.10,
    "auth_required_weight": -0.10,
}


def weights_from_config(config: models.RiskScoringConfig) -> RiskWeights:
    return {
        "cvss_weight": float(config.cvss_weight),
        "epss_weight": float(config.epss_weight),
        "internet_exposed_weight": float(config.internet_exposed_weight),
        "asset_criticality_weight": float(config.asset_criticality_weight),
        "vuln_age_weight": float(config.vuln_age_weight),
        "auth_required_weight": float(config.auth_required_weight),
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

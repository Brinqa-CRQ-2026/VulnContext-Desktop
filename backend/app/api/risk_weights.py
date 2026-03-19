from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.common import rescore_finding_in_place, validate_risk_weights
from app.core.db import get_db
from app.core.risk_weights import get_or_create_scoring_config, weights_from_config

router = APIRouter(tags=["risk-weights"])


@router.get("/risk-weights", response_model=schemas.RiskWeightsConfig)
def get_risk_weights(db: Session = Depends(get_db)):
    config = get_or_create_scoring_config(db)
    return schemas.RiskWeightsConfig(**weights_from_config(config))


@router.put("/risk-weights", response_model=schemas.RiskWeightsUpdateResult)
def update_risk_weights(
    payload: schemas.RiskWeightsConfig,
    db: Session = Depends(get_db),
):
    validate_risk_weights(payload)
    config = get_or_create_scoring_config(db)

    config.cvss_weight = payload.cvss_weight
    config.epss_weight = payload.epss_weight
    config.kev_weight = payload.kev_weight
    config.asset_criticality_weight = payload.asset_criticality_weight
    config.context_weight = payload.context_weight

    weights = weights_from_config(config)
    findings = db.query(models.ScoredFinding).all()
    for finding in findings:
        rescore_finding_in_place(finding, weights=weights)

    db.commit()
    db.refresh(config)

    return schemas.RiskWeightsUpdateResult(
        updated_rows=len(findings),
        weights=schemas.RiskWeightsConfig(**weights),
    )

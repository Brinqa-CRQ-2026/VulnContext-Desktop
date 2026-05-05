from __future__ import annotations

from app import schemas
from app.api.common import derive_risk_band
from app.repositories import findings as findings_repo


def get_sources_summary(db) -> list[schemas.SourceSummary]:
    findings = findings_repo.finding_summary_rows(db).all()
    bands = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for _, crq_finding_score, brinqa_risk_score, _ in findings:
        score = crq_finding_score if crq_finding_score is not None else brinqa_risk_score
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

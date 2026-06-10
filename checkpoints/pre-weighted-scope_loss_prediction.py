from __future__ import annotations

from typing import Any, Iterable

import numpy as np

from app import models
from app.services.fair.loss_prediction import FairLossPredictionService, LossPredictionInputs


class FairScopeLossPredictionService:
    def __init__(self):
        self.finding_service = FairLossPredictionService()

    def simulate_asset(
        self,
        db,
        asset_id: str,
        inputs: LossPredictionInputs,
        max_findings: int = 10,
    ) -> dict[str, Any]:
        findings = (
            db.query(models.Finding)
            .filter(models.Finding.asset_id == asset_id)
            .order_by(
                models.Finding.crq_finding_score.desc().nullslast(),
                models.Finding.brinqa_risk_score.desc().nullslast(),
            )
            .limit(max_findings)
            .all()
        )
        return self._simulate_findings(findings, inputs)

    def simulate_application(
        self,
        db,
        business_unit_slug: str,
        business_service_slug: str,
        application_slug: str,
        inputs: LossPredictionInputs,
        max_findings: int = 25,
    ) -> dict[str, Any]:
        application = (
            db.query(models.Application)
            .join(models.BusinessService)
            .join(models.BusinessUnit)
            .filter(
                models.BusinessUnit.slug == business_unit_slug,
                models.BusinessService.slug == business_service_slug,
                models.Application.slug == application_slug,
            )
            .first()
        )
        if application is None:
            return self._empty_response(inputs)

        findings = (
            db.query(models.Finding)
            .join(models.Asset)
            .filter(models.Asset.application_id == application.id)
            .order_by(
                models.Finding.crq_finding_score.desc().nullslast(),
                models.Finding.brinqa_risk_score.desc().nullslast(),
            )
            .limit(max_findings)
            .all()
        )
        return self._simulate_findings(findings, inputs)

    def simulate_business_service(
        self,
        db,
        business_unit_slug: str,
        business_service_slug: str,
        inputs: LossPredictionInputs,
        max_findings: int = 50,
    ) -> dict[str, Any]:
        business_service = (
            db.query(models.BusinessService)
            .join(models.BusinessUnit)
            .filter(
                models.BusinessUnit.slug == business_unit_slug,
                models.BusinessService.slug == business_service_slug,
            )
            .first()
        )
        if business_service is None:
            return self._empty_response(inputs)

        findings = (
            db.query(models.Finding)
            .join(models.Asset)
            .filter(models.Asset.business_service_id == business_service.id)
            .order_by(
                models.Finding.crq_finding_score.desc().nullslast(),
                models.Finding.brinqa_risk_score.desc().nullslast(),
            )
            .limit(max_findings)
            .all()
        )
        return self._simulate_findings(findings, inputs)

    def _simulate_findings(
        self,
        findings: Iterable[models.Finding],
        inputs: LossPredictionInputs,
    ) -> dict[str, Any]:
        results = [
            self.finding_service.simulate_with_distribution(finding, inputs)
            for finding in findings
        ]
        if not results:
            return self._empty_response(inputs)

        n = min(len(result["risk_distribution"]) for result in results)
        aggregate_distribution = np.sum(
            [result["risk_distribution"][:n] for result in results],
            axis=0,
        )
        loss_mean = float(np.mean(aggregate_distribution))
        weights = np.array([max(float(result["loss_mean"]), 0.0) for result in results])
        if float(weights.sum()) <= 0:
            weights = np.ones(len(results))

        return {
            "control_score": self._weighted_mean(results, "control_score", weights),
            "vulnerability": self._weighted_mean(results, "vulnerability", weights),
            "tef_mean": float(sum(result["tef_mean"] for result in results)),
            "lef_mean": float(sum(result["lef_mean"] for result in results)),
            "loss_mean": loss_mean,
            "loss_p50": float(np.percentile(aggregate_distribution, 50)),
            "loss_p90": float(np.percentile(aggregate_distribution, 90)),
            "loss_p95": float(np.percentile(aggregate_distribution, 95)),
            "loss_p99": float(np.percentile(aggregate_distribution, 99)),
            "worst_loss": float(np.max(aggregate_distribution)),
            "lm_mean": self._weighted_mean(results, "lm_mean", weights),
            "primary_mean": float(inputs.primary_loss_mean),
            "secondary_mean": float(inputs.secondary_loss_mean),
            "histogram": self.finding_service._histogram(aggregate_distribution),
        }

    def _weighted_mean(
        self,
        results: list[dict[str, Any]],
        key: str,
        weights: np.ndarray,
    ) -> float:
        values = np.array([float(result[key]) for result in results])
        return float(np.average(values, weights=weights))

    def _empty_response(self, inputs: LossPredictionInputs) -> dict[str, Any]:
        return {
            "control_score": 0.0,
            "vulnerability": 0.0,
            "tef_mean": 0.0,
            "lef_mean": 0.0,
            "loss_mean": 0.0,
            "loss_p50": 0.0,
            "loss_p90": 0.0,
            "loss_p95": 0.0,
            "loss_p99": 0.0,
            "worst_loss": 0.0,
            "lm_mean": 0.0,
            "primary_mean": float(inputs.primary_loss_mean),
            "secondary_mean": float(inputs.secondary_loss_mean),
            "histogram": [{"loss": 0.0, "probability": 1.0}],
        }

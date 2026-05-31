from __future__ import annotations

from typing import Any, Iterable

import numpy as np

from app import models
from app.services.fair.loss_prediction import FairLossPredictionService, LossPredictionInputs
from app.services.fair.risk_engine import RiskEngine


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
        return self._simulate_findings(findings, inputs, scope="asset")

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
        return self._simulate_findings(findings, inputs, scope="application")

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
        return self._simulate_findings(findings, inputs, scope="business_service")

    def _simulate_findings(
        self,
        findings: Iterable[models.Finding],
        inputs: LossPredictionInputs,
        scope: str,
    ) -> dict[str, Any]:
        finding_rows = list(findings)
        results = [
            self.finding_service.simulate_with_distribution(finding, inputs)
            for finding in finding_rows
        ]
        if not results:
            return self._empty_response(inputs)

        weights = np.array([max(float(result["loss_mean"]), 0.0) for result in results])
        if float(weights.sum()) <= 0:
            weights = np.ones(len(results))

        tef_mean = self._scope_tef_mean(finding_rows, results, scope)
        vulnerability = self._weighted_mean(results, "vulnerability", weights)
        escalation = self._scope_escalation_factor(finding_rows, results, weights, scope)
        lef_mean = tef_mean * vulnerability * escalation
        lm_mean = self._weighted_mean(results, "lm_mean", weights)

        rng = np.random.default_rng(42)
        lef_distribution = rng.poisson(lam=max(lef_mean, 0.0), size=inputs.iterations)
        lm_distribution = self._sample_lognormal_mean(
            lm_mean,
            sigma=0.8,
            iterations=inputs.iterations,
        )
        risk = RiskEngine().simulate(
            lef_distribution=lef_distribution,
            lm_distribution=lm_distribution,
        )
        risk_distribution = np.asarray(risk["risk_distribution"], dtype=float)

        return {
            "control_score": self._weighted_mean(results, "control_score", weights),
            "vulnerability": vulnerability,
            "tef_mean": float(tef_mean),
            "lef_mean": float(lef_mean),
            "loss_mean": float(risk["risk_mean"]),
            "loss_p50": float(risk["risk_p50"]),
            "loss_p90": float(risk["risk_p90"]),
            "loss_p95": float(risk["risk_p95"]),
            "loss_p99": float(risk["risk_p99"]),
            "worst_loss": float(risk["max_loss"]),
            "lm_mean": float(lm_mean),
            "primary_mean": float(inputs.primary_loss_mean),
            "secondary_mean": float(inputs.secondary_loss_mean),
            "histogram": self.finding_service._histogram(risk_distribution),
        }

    def _weighted_mean(
        self,
        results: list[dict[str, Any]],
        key: str,
        weights: np.ndarray,
    ) -> float:
        values = np.array([float(result[key]) for result in results])
        return float(np.average(values, weights=weights))

    def _scope_tef_mean(
        self,
        findings: list[models.Finding],
        results: list[dict[str, Any]],
        scope: str,
    ) -> float:
        tef_values = np.array([float(result["tef_mean"]) for result in results])
        max_tef = float(np.max(tef_values))
        median_tef = float(np.median(tef_values))
        diversity_count = self._diversity_count(findings, scope)
        breadth_multiplier = {
            "asset": 0.25,
            "application": 3.0,
            "business_service": 8.0,
        }.get(scope, 0.25)

        diversity_bonus = median_tef * breadth_multiplier * float(np.log1p(diversity_count))
        return max_tef + diversity_bonus

    def _diversity_count(self, findings: list[models.Finding], scope: str) -> int:
        if scope == "asset":
            return len(findings)

        asset_ids = {
            finding.asset_id
            for finding in findings
            if getattr(finding, "asset_id", None)
        }
        return max(len(asset_ids), 1)

    def _scope_escalation_factor(
        self,
        findings: list[models.Finding],
        results: list[dict[str, Any]],
        weights: np.ndarray,
        scope: str,
    ) -> float:
        if float(weights.sum()) <= 0:
            weights = np.ones(len(results))

        base = {
            "asset": 0.04,
            "application": 0.06,
            "business_service": 0.08,
        }.get(scope, 0.04)
        kev_bonus = 0.03 if any(finding.crq_finding_is_kev for finding in findings) else 0.0
        return min(base + kev_bonus, 0.18)

    def _sample_lognormal_mean(
        self,
        mean: float,
        *,
        sigma: float,
        iterations: int,
    ) -> np.ndarray:
        mean = max(float(mean), 0.0)
        if mean <= 0:
            return np.zeros(iterations)

        mu = np.log(mean + 1e-6) - (sigma**2) / 2
        return np.random.default_rng(42).lognormal(mean=mu, sigma=sigma, size=iterations)

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

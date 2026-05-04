from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app import models
from app.services.fair.frequency.interface import FrequencyEngine
from app.services.fair.magnitude.lm import LM
from app.services.fair.risk_engine import RiskEngine


@dataclass(frozen=True)
class LossPredictionInputs:
    control_context: dict[str, Any]
    primary_loss_mean: float
    secondary_loss_mean: float
    iterations: int = 10000


class FairLossPredictionService:
    def simulate(
        self,
        finding: models.Finding,
        inputs: LossPredictionInputs,
    ) -> dict[str, Any]:
        context = self._build_context(finding, inputs)

        frequency = FrequencyEngine(seed=42).simulate(
            context,
            iterations=inputs.iterations,
        )
        magnitude = LM(seed=42).simulate(context, iterations=inputs.iterations)
        risk = RiskEngine().simulate(
            lef_distribution=frequency["lef"]["lef_distribution"],
            lm_distribution=magnitude["lm_distribution"],
        )

        risk_distribution = np.asarray(risk["risk_distribution"], dtype=float)

        return {
            "control_score": float(frequency["control_score"]),
            "vulnerability": float(frequency["vulnerability"]),
            "tef_mean": float(frequency["tef"]["tef_mean"]),
            "lef_mean": float(frequency["lef"]["lef_mean"]),
            "loss_mean": float(risk["risk_mean"]),
            "loss_p50": float(risk["risk_p50"]),
            "loss_p90": float(risk["risk_p90"]),
            "loss_p95": float(risk["risk_p95"]),
            "loss_p99": float(risk["risk_p99"]),
            "worst_loss": float(risk["max_loss"]),
            "lm_mean": float(magnitude["lm_mean"]),
            "primary_mean": float(magnitude["primary_mean"]),
            "secondary_mean": float(magnitude["secondary_mean"]),
            "histogram": self._histogram(risk_distribution),
        }

    def _build_context(
        self,
        finding: models.Finding,
        inputs: LossPredictionInputs,
    ) -> dict[str, Any]:
        asset = finding.asset
        exposure = self._bounded(getattr(asset, "crq_asset_exposure_score", None), 0.5)
        asset_type = self._bounded(getattr(asset, "crq_asset_type_score", None), 0.5)
        sensitivity = self._bounded(
            getattr(asset, "crq_asset_data_sensitivity_score", None),
            0.5,
        )
        environment = self._bounded(getattr(asset, "crq_asset_environment_score", None), 0.5)

        context: dict[str, Any] = {
            "crq_asset_exposure_score": exposure,
            "crq_asset_type_score": asset_type,
            "crq_asset_data_sensitivity_score": sensitivity,
            "crq_asset_environment_score": environment,
            "crq_asset_context_score": self._score_10(
                getattr(asset, "crq_asset_context_score", None),
                5.0,
            ),
            "crq_asset_aggregated_finding_risk": self._score_10(
                getattr(asset, "crq_asset_aggregated_finding_risk", None),
                5.0,
            ),
            "crq_finding_score": self._score_10(
                finding.crq_finding_score or finding.brinqa_risk_score,
                5.0,
            ),
            "epss": self._bounded(finding.crq_finding_epss_score, 0.01, upper=0.999),
            "is_kev": bool(finding.crq_finding_is_kev),
            "age_in_days": finding.age_in_days or 0,
            "primary_loss_mean": inputs.primary_loss_mean,
            "secondary_loss_mean": inputs.secondary_loss_mean,
        }

        context.update(self._flatten_control_context(inputs.control_context))
        return context

    def _flatten_control_context(self, control_context: dict[str, Any]) -> dict[str, float]:
        flattened: dict[str, float] = {}
        for key, value in control_context.items():
            if isinstance(value, dict):
                for nested_key, nested_value in value.items():
                    flattened[f"{key}_{nested_key}"] = float(nested_value)
            else:
                flattened[key] = float(value)

        return flattened

    def _histogram(self, values: np.ndarray, bins: int = 24) -> list[dict[str, float]]:
        if values.size == 0:
            return []

        upper = float(np.percentile(values, 99))
        if upper <= 0:
            return [{"loss": 0.0, "probability": 1.0}]

        clipped = np.clip(values, 0, upper)
        counts, edges = np.histogram(clipped, bins=bins, range=(0, upper))
        total = max(float(counts.sum()), 1.0)

        return [
            {
                "loss": float((edges[index] + edges[index + 1]) / 2),
                "probability": float(count / total),
            }
            for index, count in enumerate(counts)
        ]

    def _bounded(self, value: float | None, fallback: float, *, upper: float = 1.0) -> float:
        if value is None:
            value = fallback
        return min(max(float(value), 0.0), upper)

    def _score_10(self, value: float | None, fallback: float) -> float:
        if value is None:
            value = fallback
        return min(max(float(value), 0.0), 10.0)

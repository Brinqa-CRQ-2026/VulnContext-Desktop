import numpy as np
from .tef import TEF
from .vulnerability import VulnerabilityEngine
from .lef import LEF

class FrequencyEngine:
    def __init__(self, seed=None):
        self.seed = seed

    def simulate(self, context: dict, iterations: int = 10000):
        tef_engine = TEF(seed=self.seed)

        tef_results = tef_engine.simulate(
            crq_asset_exposure_score=context["crq_asset_exposure_score"],
            crq_asset_type_score=context["crq_asset_type_score"],
            epss=context["epss"],
            is_kev=context["is_kev"],
            iterations=iterations
        )

        vulnerability_engine = VulnerabilityEngine()

        vulnerability = vulnerability_engine.compute(
            epss=context["epss"],
            is_kev=context["is_kev"],
            crq_asset_context_score=context["crq_asset_context_score"],
            crq_asset_aggregated_finding_risk=context["crq_asset_aggregated_finding_risk"],
            crq_finding_score=context["crq_finding_score"],
            age_in_days=context["age_in_days"],
            iterations=iterations
        )

        lef_engine = LEF()

        escalation_prob = self._derive_escalation_probability(context)

        lef_results = lef_engine.simulate(
            lambda_samples=tef_results["lambda_distribution"],
            vulnerability=vulnerability,
            escalation_prob=escalation_prob
        )

        return {
            "tef": tef_results,
            "vulnerability": vulnerability,
            "lef": lef_results
        }

    def _derive_escalation_probability(self, context):
        sensitivity = context["crq_asset_data_sensitivity_score"]
        environment = context["crq_asset_environment_score"]
        type_score = context["crq_asset_type_score"]
        exposure = context["crq_asset_exposure_score"]
        is_kev = context["is_kev"]

        impact_potential = sensitivity * environment

        blast_radius = (
            0.6 * type_score +
            0.4 * exposure
        )

        containment = 1 - (
            0.5 * exposure +
            0.5 * (1 - type_score)
        )

        containment = max(0.1, min(containment, 1.0))

        escalation = (
            0.05 +
            0.6 * impact_potential * blast_radius * (1 - containment)
        )

        if is_kev:
            escalation += 0.05

        return min(escalation, 1.0)
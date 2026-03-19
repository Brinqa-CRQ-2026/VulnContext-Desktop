import numpy as np
from .tef import TEF
from .vulnerability import (
    ThreatCapabilityModel,
    ResistanceStrengthModel,
    VulnerabilityEngine
)
from .lef import LEF

class FrequencyEngine:
    def __init__(self, seed = None):
        self.seed = seed

    def simulate(self, context: dict, iterations: int = 10000):
        mu_tcap, sigma_tcap = self._derive_threat_parameters(context)
        tcap_model = ThreatCapabilityModel(mu=mu_tcap, sigma=sigma_tcap)

        base_force, sigma_rs = self._derive_resistance_parameters(context)

        rs_model = ResistanceStrengthModel(
            base_force=base_force,
            sigma=sigma_rs
        )

        vuln_engine = VulnerabilityEngine(
            tcap_model=tcap_model,
            rs_model=rs_model
        )

        vulnerability = vuln_engine.compute(
            control_score=context["control_score"],
            iterations=iterations
        )

        tef_engine = TEF(seed=self.seed)

        tef_results = tef_engine.simulate(
            internet_exposed=context["internet_exposed"],
            asset_type=context["asset_type"],
            service=context["service"],
            epss_annual=context["epss_annual"],
            iterations=iterations
        )

        lambda_samples = tef_results["lambda_distribution"]

        lef_engine = LEF()

        escalation_prob = self._derive_escalation_probability(context)

        lef_results = lef_engine.simulate(
            lambda_samples=lambda_samples,
            vulnerability=vulnerability,
            escalation_prob=escalation_prob
        )

        return lef_results
    
    def _derive_threat_parameters(self, context):
        epss = context["epss_annual"]
        
        mu = 0.8 + 1.2 * epss
        sigma = 0.6 + 0.2 * epss

        return mu, sigma
    
    def _derive_resistance_parameters(self, context):
        control_score = context["control_score"]

        base_force = 1.0 + 2.5 * control_score
        sigma = 0.4 - 0.2 * control_score

        return base_force, sigma
    
    def _derive_escalation_probability(self, context):
        control_score = context["control_score"]

        escalation = 0.3 * (1 - control_score)

        return escalation
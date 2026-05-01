import numpy as np

class ControlInference:
    def compute(self, context: dict) -> float:
        finding_risk = context["crq_asset_aggregated_finding_risk"] / 10
        age = min(context.get("age_in_days", 0) / 365, 1.0)

        exposure = context["crq_asset_exposure_score"]
        environment = context["crq_asset_environment_score"]

        prevent = 0.6 * (1 - finding_risk) + 0.4 * (1 - age)
        detect = 0.5
        respond = 0.5
        contain = 0.5 * (1 - exposure) + 0.5 * (1 - environment)

        score = (
            0.35 * prevent +
            0.25 * detect +
            0.25 * respond +
            0.15 * contain
        )

        return float(np.clip(score, 0.0, 1.0))
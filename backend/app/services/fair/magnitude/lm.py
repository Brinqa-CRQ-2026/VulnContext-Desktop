import numpy as np

class LM:
    def __init__(self, seed=None):
        if seed is not None:
            np.random.seed(seed)

    def simulate(self, context: dict, iterations: int = 10000):
        primary = self._simulate_primary_loss(context, iterations)
        secondary = self._simulate_secondary_loss(context, iterations)

        total_loss = primary + secondary

        return {
            "lm_mean": np.mean(total_loss),
            "lm_distribution": total_loss,
            "primary_mean": np.mean(primary),
            "secondary_mean": np.mean(secondary)
        }

    def _simulate_primary_loss(self, context, iterations):
        service_value = context.get("service_value", 100000)

        sensitivity = context["crq_asset_data_sensitivity_score"]
        environment = context["crq_asset_environment_score"]
        type_score = context["crq_asset_type_score"]

        impact_factor = (
            0.5 * sensitivity +
            0.3 * environment +
            0.2 * type_score
        )

        duration_days_mean = context.get("downtime_days_mean", 2)

        duration_samples = np.random.lognormal(
            mean=np.log(duration_days_mean + 1e-6),
            sigma=0.5,
            size=iterations
        )

        duration_fraction = np.clip(duration_samples / 365, 0, 0.2)

        primary_loss = service_value * impact_factor * duration_fraction

        return primary_loss

    def _simulate_secondary_loss(self, context, iterations):
        service_value = context.get("service_value", 100000)
        mean = 0.07 * service_value

        if mean <= 0:
            return np.zeros(iterations)

        sensitivity = context["crq_asset_data_sensitivity_score"]
        environment = context["crq_asset_environment_score"]

        trigger_prob = 0.05 + 0.3 * (sensitivity * environment)
        trigger_prob = min(trigger_prob, 1.0)

        triggers = np.random.binomial(1, trigger_prob, size=iterations)

        sigma = context.get("secondary_sigma", 1.0)

        secondary_samples = np.random.lognormal(
            mean=np.log(mean + 1e-6),
            sigma=sigma,
            size=iterations
        )
        secondary_samples = np.clip(secondary_samples, 0, 150000)

        return triggers * secondary_samples
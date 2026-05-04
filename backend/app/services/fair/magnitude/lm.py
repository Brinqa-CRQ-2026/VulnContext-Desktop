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
        requested_mean = context.get("primary_loss_mean")
        if requested_mean is not None:
            return self._sample_lognormal_mean(requested_mean, context.get("primary_sigma", 0.65), iterations)

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
        requested_mean = context.get("secondary_loss_mean")
        if requested_mean is not None:
            trigger_prob = self._derive_secondary_trigger_probability(context)
            conditional_mean = requested_mean / max(trigger_prob, 0.001)
            return (
                np.random.binomial(1, trigger_prob, size=iterations)
                * self._sample_lognormal_mean(
                    conditional_mean,
                    context.get("secondary_sigma", 1.0),
                    iterations,
                )
            )

        service_value = context.get("service_value", 100000)
        mean = 0.07 * service_value

        if mean <= 0:
            return np.zeros(iterations)

        sensitivity = context["crq_asset_data_sensitivity_score"]
        environment = context["crq_asset_environment_score"]

        trigger_prob = self._derive_secondary_trigger_probability(context)

        triggers = np.random.binomial(1, trigger_prob, size=iterations)

        sigma = context.get("secondary_sigma", 1.0)

        secondary_samples = np.random.lognormal(
            mean=np.log(mean + 1e-6),
            sigma=sigma,
            size=iterations
        )
        secondary_samples = np.clip(secondary_samples, 0, 150000)

        return triggers * secondary_samples

    def _derive_secondary_trigger_probability(self, context):
        sensitivity = context["crq_asset_data_sensitivity_score"]
        environment = context["crq_asset_environment_score"]
        trigger_prob = 0.05 + 0.3 * (sensitivity * environment)
        return min(trigger_prob, 1.0)

    def _sample_lognormal_mean(self, mean, sigma, iterations):
        mean = max(float(mean), 0.0)
        if mean <= 0:
            return np.zeros(iterations)

        sigma = max(float(sigma), 0.05)
        mu = np.log(mean + 1e-6) - (sigma**2) / 2
        return np.random.lognormal(mean=mu, sigma=sigma, size=iterations)

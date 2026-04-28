import numpy as np

class RiskEngine:
    def simulate(
        self,
        lef_distribution: np.ndarray,
        lm_distribution: np.ndarray,
        rho: float = 0.5
    ) -> dict:

        n = min(len(lef_distribution), len(lm_distribution))

        lef = lef_distribution[:n]
        lm = lm_distribution[:n]

        # normalize ranks (0 → 1)
        lef_ranks = np.argsort(np.argsort(lef)) / (n - 1)
        lm_sorted = np.sort(lm)

        # correlated LM via rank blending
        random_ranks = np.random.permutation(n) / (n - 1)
        blended_ranks = rho * lef_ranks + (1 - rho) * random_ranks

        indices = (blended_ranks * (n - 1)).astype(int)
        lm_correlated = lm_sorted[indices]

        annual_loss = lef * lm_correlated

        return {
            "risk_mean": np.mean(annual_loss),
            "risk_distribution": annual_loss,

            "risk_p50": np.percentile(annual_loss, 50),
            "risk_p90": np.percentile(annual_loss, 90),
            "risk_p95": np.percentile(annual_loss, 95),
            "risk_p99": np.percentile(annual_loss, 99),

            "max_loss": np.max(annual_loss),

            "lef_mean": np.mean(lef),
            "lm_mean": np.mean(lm_correlated)
        }
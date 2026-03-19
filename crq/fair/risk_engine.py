import numpy as np

class RiskEngine:
    def simulate(
        self,
        lef_distribution: np.ndarray,
        lm_distribution: np.ndarray
    ) -> dict:
        annual_loss = lef_distribution * lm_distribution

        return {
            "risk_mean": np.mean(annual_loss),
            "risk_distribution": annual_loss,
            "risk_p90": np.percentile(annual_loss, 90),
            "risk_p95": np.percentile(annual_loss, 95)
        }
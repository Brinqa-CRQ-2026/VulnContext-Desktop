import numpy as np
from .tef import TEF

class LEF:
    def __init__(self):
        pass

    def simulate(
        self,
        lambda_samples: np.ndarray,
        vulnerability: float,
        escalation_prob: float
    ) -> dict:
        if not 0 <= vulnerability <= 1:
            raise ValueError("Vuln must be between 0 and 1")
        
        if not 0 <= escalation_prob <= 1:
            raise ValueError("Escalation probability must be between 0 and 1")
        
        lambda_success = lambda_samples * vulnerability

        lambda_loss = lambda_success * escalation_prob

        loss_events = np.random.poisson(
            lam=lambda_loss
        )

        return {
            "lef_mean": np.mean(loss_events),
            "lef_distribution": loss_events,
            "lambda_success_mean": np.mean(lambda_loss)
        }
    
#need to build test module
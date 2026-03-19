import numpy as np

class LossMagnitude:
    def __init__(self):
        pass

    def simulate(
        self,
        primary_mean: float,
        primary_sigma: float,
        secondary_prob: float,
        secondary_mean: float,
        secondary_sigma: float,
        iterations: int = 10000
    ) -> dict:
        primary_losses = np.random.lognormal(
            mean=np.log(primary_mean),
            sigma=primary_sigma,
            size=iterations
        )

        secondary_trigger = np.random.binomial(
            n=1,
            p=secondary_prob,
            size=iterations
        )

        secondary_losses = np.random.lognormal(
            mean=np.log(secondary_mean),
            sigma=secondary_sigma,
            size=iterations
        )

        secondary_losses = secondary_losses * secondary_trigger

        total_loss = primary_losses + secondary_losses

        return{
            "lm_mean": np.mean(total_loss),
            "lm_distribution": total_loss,
            "primary_mean": np.mean(primary_losses),
            "secondary_mean": np.mean(secondary_losses)
        }
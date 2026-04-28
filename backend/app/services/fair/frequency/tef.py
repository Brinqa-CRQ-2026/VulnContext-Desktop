import numpy as np

class TEF:
    def __init__(
        self,
        base_contact_rate: float = 5.0,
        cf_sigma: float = 0.8,
        poa_concentration: float = 20,
        seed: int | None = None,
    ):
        self.base_contact_rate = base_contact_rate
        self.cf_sigma = cf_sigma
        self.poa_concentration = poa_concentration

        if seed is not None:
            np.random.seed(seed)

    def sample_contact_frequency(
        self,
        crq_asset_exposure_score: float,
        crq_asset_type_score: float,
        iterations: int = 10000
    ):
        exposure = min(max(crq_asset_exposure_score, 0.0), 1.0)
        asset_weight = min(max(crq_asset_type_score, 0.0), 1.0)

        exposure_multiplier_samples = np.random.lognormal(
            mean=np.log(1 + 20 * exposure),
            sigma=0.4,
            size=iterations
        )

        base = self.base_contact_rate * (1 + 2 * asset_weight)

        cf_mean_samples = base * exposure_multiplier_samples

        mu = np.log(cf_mean_samples) - (self.cf_sigma**2) / 2

        cf_samples = np.random.lognormal(
            mean=mu,
            sigma=self.cf_sigma
        )

        return cf_samples

    def compute_poa_mean(
        self,
        epss: float,
        is_kev: bool
    ):
        poa = epss

        if is_kev:
            poa *= 2.0

        return min(max(poa, 0.001), 0.999)

    def sample_poa(
        self,
        poa_mean: float,
        iterations: int = 10000
    ):
        alpha = poa_mean * self.poa_concentration
        beta_param = (1 - poa_mean) * self.poa_concentration

        return np.random.beta(alpha, beta_param, size=iterations)

    def simulate(
        self,
        crq_asset_exposure_score: float,
        crq_asset_type_score: float,
        epss: float,
        is_kev: bool,
        iterations: int = 10000
    ):
        cf_samples = self.sample_contact_frequency(
            crq_asset_exposure_score,
            crq_asset_type_score,
            iterations
        )

        poa_mean = self.compute_poa_mean(epss, is_kev)

        poa_samples = self.sample_poa(
            poa_mean,
            iterations
        )

        lambda_samples = cf_samples * poa_samples

        tef_samples = np.random.poisson(lam=lambda_samples)

        return {
            "cf_mean": np.mean(cf_samples),
            "poa_mean": poa_mean,
            "lambda_mean": np.mean(lambda_samples),
            "tef_mean": np.mean(tef_samples),
            "lambda_distribution": lambda_samples,
            "tef_distribution": tef_samples
        }
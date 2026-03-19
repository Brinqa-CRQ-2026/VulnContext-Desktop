import numpy as np
from scipy.stats import lognorm, beta

class TEF:
    def __init__(
        self,
        base_contact_rate: float = 5.0,
        cf_sigma: float = 1.0,
        poa_base: float = 0.02,
        poa_sensitivity: float = 0.25,
        poa_concentration: float = 20,
        seed: int | None = None,
    ):
        self.base_contact_rate = base_contact_rate
        self.cf_sigma = cf_sigma
        self.poa_base = poa_base
        self.poa_sensitivity = poa_sensitivity
        self.poa_concentration = poa_concentration

        if seed is not None:
            np.random.seed(seed)

        self.service_multipliers = {
            "http": 3.0,
            "https": 3.0,
            "rdp": 4.0,
            "ssh": 3.0,
            "database": 2.0
        }

        self.asset_multipliers = {
            "Web Server": 2.5,
            "Application Server": 2.0,
            "Database Server": 2.0,
            "Domain Controller": 3.0,
            "File Server": 1.5,
            "Misc Server": 1.0,
        }

    def compute_cf_mean(
        self,
        internet_exposed: bool,
        asset_type: str,
        service: str,
    ) -> float:
        exposure_multiplier = 200.0 if internet_exposed else 1.0

        S = self.service_multipliers.get(service.lower(), 1.5)
        A = self.asset_multipliers.get(asset_type, 1.0)

        return self.base_contact_rate * exposure_multiplier * S * A

    def sample_contact_frequency(
        self,
        internet_exposed: bool,
        asset_type: str,
        service: str,
        iterations: int = 10000
    ) -> np.ndarray:

        # Base deterministic components
        S = self.service_multipliers.get(service.lower(), 1.5)
        A = self.asset_multipliers.get(asset_type, 1.0)

        # Stochastic exposure multiplier
        if internet_exposed:
            exposure_samples = np.random.lognormal(
                mean=np.log(50),      # center around 50 instead of 200
                sigma=0.4,
                size=iterations
            )
        else:
            exposure_samples = np.ones(iterations)

        base = self.base_contact_rate * S * A

        cf_mean_samples = base * exposure_samples

        # Convert means to lognormal sampling properly
        mu = np.log(cf_mean_samples) - (self.cf_sigma**2) / 2

        cf_samples = np.random.lognormal(
            mean=mu,
            sigma=self.cf_sigma
        )

        return cf_samples

    def compute_poa_mean(
        self,
        epss_annual: float
    ) -> float:
        m = self.poa_base + self.poa_sensitivity + epss_annual
        return min(max(m, 0.001), 0.999)

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
        internet_exposed: bool,
        asset_type: str,
        service: str,
        epss_annual: float,
        iterations: int = 10000
    ) -> dict:
        cf_samples = self.sample_contact_frequency(
            internet_exposed=internet_exposed,
            asset_type=asset_type,
            service=service,
            iterations=iterations
        )

        poa_mean = self.compute_poa_mean(epss_annual=epss_annual)
        poa_samples = self.sample_poa(poa_mean=poa_mean, iterations=iterations)

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

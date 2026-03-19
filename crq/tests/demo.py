import numpy as np

from fair.frequency.interface import FrequencyEngine
from fair.magnitude.lm import LossMagnitude
from fair.risk_engine import RiskEngine


def run_demo():

    print("\n==============================")
    print(" FAIR Monte Carlo Risk Demo")
    print("==============================\n")

    context = {
        "internet_exposed": True,
        "asset_type": "Web Server",
        "service": "https",
        "epss_annual": 0.35,
        "control_score": None
    }

    maturity_levels = [0.2, 0.6, 0.9]

    for maturity in maturity_levels:

        print(f"\n--- Control Score: {maturity} ---")

        context["control_score"] = maturity

        freq_engine = FrequencyEngine(seed=42)

        freq_results = freq_engine.simulate(
            context=context,
            iterations=20000
        )

        lef_distribution = freq_results["lef_distribution"]

        print(f"LEF Mean: {np.mean(lef_distribution):.4f}")

        lm_engine = LossMagnitude()

        lm_results = lm_engine.simulate(
            primary_mean=30_000,
            primary_sigma=0.7,
            secondary_prob=0.15,
            secondary_mean=120_000,
            secondary_sigma=0.9,
            iterations=20000
        )

        lm_distribution = lm_results["lm_distribution"]

        risk_engine = RiskEngine()

        risk_results = risk_engine.simulate(
            lef_distribution=lef_distribution,
            lm_distribution=lm_distribution
        )

        print(f"Annual Risk Mean: ${risk_results['risk_mean']:,.0f}")
        print(f"P90: ${risk_results['risk_p90']:,.0f}")
        print(f"P95: ${risk_results['risk_p95']:,.0f}")

    print("\n==============================")
    print(" Demo Complete")
    print("==============================\n")


if __name__ == "__main__":
    run_demo()
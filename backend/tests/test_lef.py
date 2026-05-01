import numpy as np
from app.services.fair.frequency.lef import LEF


def run():
    np.random.seed(42)

    lambda_samples = np.random.uniform(0.1, 5.0, 10000)
    vulnerability = 0.4
    escalation_prob = 0.3

    lef = LEF().simulate(
        lambda_samples=lambda_samples,
        vulnerability=vulnerability,
        escalation_prob=escalation_prob
    )

    print("\n=== LEF TEST ===")
    print("Lambda mean:", np.mean(lambda_samples))
    print("Vulnerability:", vulnerability)
    print("Escalation prob:", escalation_prob)
    print("LEF mean:", lef["lef_mean"])
    print("Lambda loss mean:", lef["lambda_loss_mean"])
    print("Sample LEF distribution (first 20):", lef["lef_distribution"][:20])


if __name__ == "__main__":
    run()
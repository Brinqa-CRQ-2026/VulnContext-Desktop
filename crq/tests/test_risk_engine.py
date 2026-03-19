from fair.frequency.interface import FrequencyEngine
from fair.magnitude.lm import LossMagnitude
from fair.risk_engine import RiskEngine

engine = FrequencyEngine(seed=42)

context = {
    "internet_exposed": True,
    "asset_type": "Web Server",
    "service": "https",
    "epss_annual": 0.3,
    "control_score": 0.2
}

freq_results = engine.simulate(context, iterations=20000)

lef_distribution = freq_results["lef_distribution"]

print("LEF Mean:", freq_results["lef_mean"])

lm_engine = LossMagnitude()

lm_results = lm_engine.simulate(
    primary_mean=50000,
    primary_sigma=0.6,
    secondary_prob=0.3,
    secondary_mean=200000,
    secondary_sigma=0.8,
    iterations=20000
)

lm_distribution = lm_results["lm_distribution"]

risk_engine = RiskEngine()

risk_results = risk_engine.simulate(
    lef_distribution=lef_distribution,
    lm_distribution=lm_distribution
)

print("Annual Risk Mean:", risk_results["risk_mean"])
print("P90:", risk_results["risk_p90"])
print("P95:", risk_results["risk_p95"])
from fair.frequency.interface import FrequencyEngine

context = {
    "internet_exposed": True,
    "asset_type": "Web Server",
    "service": "https",
    "epss_annual": 0.3,
    "control_score": 0.2
}

engine = FrequencyEngine(seed=42)

results = engine.simulate(context, iterations=20000)

print(results["lef_mean"])
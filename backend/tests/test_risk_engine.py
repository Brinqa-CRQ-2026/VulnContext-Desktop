from app.services.fair.frequency.interface import FrequencyEngine
from app.services.fair.magnitude.lm import LM
from app.services.fair.risk_engine import RiskEngine


def run():
    scenarios = {
        "LOW_RISK_INTERNAL_WORKSTATION": {
            "crq_asset_exposure_score": 0.2,
            "crq_asset_type_score": 0.3,
            "crq_asset_data_sensitivity_score": 0.2,
            "crq_asset_environment_score": 0.3,
            "crq_asset_context_score": 3.0,
            "crq_asset_aggregated_finding_risk": 2.0,
            "crq_finding_score": 3.0,
            "epss": 0.1,
            "is_kev": False,
            "age_in_days": 30,
            "service_value": 50000,
            "secondary_loss_mean": 5000
        },

        "MEDIUM_RISK_INTERNAL_SERVER": {
            "crq_asset_exposure_score": 0.4,
            "crq_asset_type_score": 0.6,
            "crq_asset_data_sensitivity_score": 0.5,
            "crq_asset_environment_score": 0.7,
            "crq_asset_context_score": 6.0,
            "crq_asset_aggregated_finding_risk": 5.5,
            "crq_finding_score": 6.0,
            "epss": 0.3,
            "is_kev": False,
            "age_in_days": 90,
            "service_value": 120000,
            "secondary_loss_mean": 15000
        },

        "HIGH_RISK_PUBLIC_WEB_APP": {
            "crq_asset_exposure_score": 0.9,
            "crq_asset_type_score": 0.8,
            "crq_asset_data_sensitivity_score": 0.9,
            "crq_asset_environment_score": 0.9,
            "crq_asset_context_score": 9.0,
            "crq_asset_aggregated_finding_risk": 8.0,
            "crq_finding_score": 8.5,
            "epss": 0.7,
            "is_kev": True,
            "age_in_days": 120,
            "service_value": 250000,
            "secondary_loss_mean": 40000
        },

        "CRITICAL_DATABASE": {
            "crq_asset_exposure_score": 0.6,
            "crq_asset_type_score": 0.9,
            "crq_asset_data_sensitivity_score": 1.0,
            "crq_asset_environment_score": 1.0,
            "crq_asset_context_score": 9.5,
            "crq_asset_aggregated_finding_risk": 7.0,
            "crq_finding_score": 7.5,
            "epss": 0.5,
            "is_kev": True,
            "age_in_days": 150,
            "service_value": 500000,
            "secondary_loss_mean": 80000
        },

        "CLOUD_CONTAINER_SERVICE": {
            "crq_asset_exposure_score": 0.7,
            "crq_asset_type_score": 0.7,
            "crq_asset_data_sensitivity_score": 0.6,
            "crq_asset_environment_score": 0.8,
            "crq_asset_context_score": 7.5,
            "crq_asset_aggregated_finding_risk": 6.5,
            "crq_finding_score": 7.0,
            "epss": 0.4,
            "is_kev": False,
            "age_in_days": 60,
            "service_value": 180000,
            "secondary_loss_mean": 25000
        }
    }

    for name, context in scenarios.items():
        print("\n==============================")
        print("SCENARIO:", name)
        print("==============================")

        freq = FrequencyEngine(seed=42).simulate(context)
        lm = LM(seed=42).simulate(context)

        risk = RiskEngine().simulate(
            lef_distribution=freq["lef"]["lef_distribution"],
            lm_distribution=lm["lm_distribution"]
        )

        print("\n--- FREQUENCY ---")
        print("TEF mean:", freq["tef"]["tef_mean"])
        print("Vulnerability:", freq["vulnerability"])
        print("Control score:", freq["control_score"])
        print("LEF mean:", freq["lef"]["lef_mean"])

        print("\n--- MAGNITUDE ---")
        print("LM mean:", lm["lm_mean"])
        print("Primary mean:", lm["primary_mean"])
        print("Secondary mean:", lm["secondary_mean"])

        print("\n--- RISK ---")
        print("Risk mean:", risk["risk_mean"])
        print("P50:", risk["risk_p50"])
        print("P90:", risk["risk_p90"])
        print("P95:", risk["risk_p95"])
        print("P99:", risk["risk_p99"])
        print("Max loss:", risk["max_loss"])


if __name__ == "__main__":
    run()
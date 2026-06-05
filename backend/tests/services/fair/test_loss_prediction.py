import numpy as np
import pytest

from app.services.fair import loss_prediction as loss_prediction_module
from app.services.fair.loss_prediction import FairLossPredictionService, LossPredictionInputs
from helpers.findings import seed_asset_and_finding


def test_loss_prediction_context_uses_asset_finding_scores_and_bounded_fallbacks(db_session):
    asset, finding = seed_asset_and_finding(
        db_session,
        idx=31,
        risk=8.0,
        crq_finding_score=9.5,
        crq_finding_is_kev=True,
    )
    asset.crq_asset_exposure_score = 2.0
    asset.crq_asset_type_score = -1.0
    asset.crq_asset_data_sensitivity_score = None
    asset.crq_asset_environment_score = 0.8
    asset.crq_asset_context_score = 12.0
    asset.crq_asset_aggregated_finding_risk = None
    finding.crq_finding_epss_score = None
    finding.age_in_days = None
    db_session.commit()

    context = FairLossPredictionService()._build_context(
        finding,
        LossPredictionInputs(
            control_context={"prevent": {"patch_maturity": 4}, "detect_logging_maturity": 3},
            primary_loss_mean=25000,
            secondary_loss_mean=7000,
            iterations=1000,
        ),
    )

    assert context["crq_asset_exposure_score"] == 1.0
    assert context["crq_asset_type_score"] == 0.0
    assert context["crq_asset_data_sensitivity_score"] == 0.5
    assert context["crq_asset_environment_score"] == 0.8
    assert context["crq_asset_context_score"] == 10.0
    assert context["crq_asset_aggregated_finding_risk"] == 5.0
    assert context["crq_finding_score"] == 9.5
    assert context["epss"] == 0.01
    assert context["is_kev"] is True
    assert context["age_in_days"] == 0
    assert context["prevent_patch_maturity"] == 4.0
    assert context["detect_logging_maturity"] == 3.0
    assert context["primary_loss_mean"] == 25000
    assert context["secondary_loss_mean"] == 7000


def test_loss_prediction_histogram_handles_empty_zero_and_positive_values():
    service = FairLossPredictionService()

    assert service._histogram(np.array([])) == []
    assert service._histogram(np.zeros(10)) == [{"loss": 0.0, "probability": 1.0}]

    histogram = service._histogram(np.array([0.0, 10.0, 20.0, 30.0]), bins=3)

    assert len(histogram) == 3
    assert sum(bucket["probability"] for bucket in histogram) == pytest.approx(1.0)


def test_loss_prediction_orchestrates_frequency_magnitude_and_risk(monkeypatch, db_session):
    _, finding = seed_asset_and_finding(db_session, idx=32, risk=8.0)

    class FakeFrequencyEngine:
        def __init__(self, seed=None):
            self.seed = seed

        def simulate(self, context, iterations):
            assert iterations == 1000
            return {
                "control_score": 0.7,
                "vulnerability": 0.2,
                "tef": {"tef_mean": 4.0},
                "lef": {
                    "lef_mean": 0.8,
                    "lef_distribution": np.array([0, 1, 2, 3]),
                },
            }

    class FakeLM:
        def __init__(self, seed=None):
            self.seed = seed

        def simulate(self, context, iterations):
            assert context["primary_loss_mean"] == 10000
            return {
                "lm_distribution": np.array([1000.0, 2000.0, 3000.0, 4000.0]),
                "lm_mean": 2500.0,
                "primary_mean": 2000.0,
                "secondary_mean": 500.0,
            }

    class FakeRiskEngine:
        def simulate(self, lef_distribution, lm_distribution):
            assert lef_distribution.tolist() == [0, 1, 2, 3]
            assert lm_distribution.tolist() == [1000.0, 2000.0, 3000.0, 4000.0]
            return {
                "risk_distribution": np.array([0.0, 2000.0, 6000.0, 12000.0]),
                "risk_mean": 5000.0,
                "risk_p50": 4000.0,
                "risk_p90": 10200.0,
                "risk_p95": 11100.0,
                "risk_p99": 11820.0,
                "max_loss": 12000.0,
            }

    monkeypatch.setattr(loss_prediction_module, "FrequencyEngine", FakeFrequencyEngine)
    monkeypatch.setattr(loss_prediction_module, "LM", FakeLM)
    monkeypatch.setattr(loss_prediction_module, "RiskEngine", FakeRiskEngine)

    result = FairLossPredictionService().simulate_with_distribution(
        finding,
        LossPredictionInputs(
            control_context={},
            primary_loss_mean=10000,
            secondary_loss_mean=5000,
            iterations=1000,
        ),
    )
    response = FairLossPredictionService().simulate(
        finding,
        LossPredictionInputs(
            control_context={},
            primary_loss_mean=10000,
            secondary_loss_mean=5000,
            iterations=1000,
        ),
    )

    assert result["loss_mean"] == 5000.0
    assert result["risk_distribution"].tolist() == [0.0, 2000.0, 6000.0, 12000.0]
    assert result["histogram"]
    assert "risk_distribution" not in response

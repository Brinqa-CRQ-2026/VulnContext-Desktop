import numpy as np
import pytest

from app.services.fair.controls.control_engine import ControlEngine
from app.services.fair.controls.control_inference import ControlInference
from app.services.fair.controls.control_scoring import ControlScoring
from app.services.fair.frequency.interface import FrequencyEngine
from app.services.fair.frequency.lef import LEF
from app.services.fair.frequency.tef import TEF
from app.services.fair.frequency.vulnerability import (
    ResistanceStrengthModel,
    ThreatCapabilityModel,
    VulnerabilityEngine,
)
from app.services.fair.magnitude.lm import LM


def fair_context(**overrides):
    context = {
        "crq_asset_exposure_score": 0.7,
        "crq_asset_type_score": 0.8,
        "crq_asset_data_sensitivity_score": 0.6,
        "crq_asset_environment_score": 0.9,
        "crq_asset_aggregated_finding_risk": 7.5,
        "epss": 0.2,
        "is_kev": False,
        "age_in_days": 45,
        "primary_loss_mean": 20000,
        "secondary_loss_mean": 5000,
        "prevent_patch_maturity": 4,
        "detect_logging_maturity": 3,
        "respond_plan_maturity": 2,
        "contain_edr_maturity": 5,
    }
    context.update(overrides)
    return context


def test_tef_clamps_poa_and_kev_increases_probability_of_action():
    engine = TEF(seed=42)

    assert engine.compute_poa_mean(-1.0, False) == 0.001
    assert engine.compute_poa_mean(2.0, False) == 0.999
    assert engine.compute_poa_mean(0.2, True) > engine.compute_poa_mean(0.2, False)

    result = engine.simulate(
        crq_asset_exposure_score=0.5,
        crq_asset_type_score=0.7,
        epss=0.2,
        is_kev=True,
        iterations=1000,
    )

    assert result["cf_mean"] > 0
    assert 0.001 <= result["poa_mean"] <= 0.999
    assert result["lambda_distribution"].shape == (1000,)
    assert result["tef_distribution"].shape == (1000,)


def test_lef_validates_probability_inputs_and_returns_distribution():
    lambda_samples = np.array([1.0, 2.0, 3.0])
    result = LEF().simulate(lambda_samples, vulnerability=0.5, escalation_prob=0.2)

    assert result["lambda_loss_mean"] == pytest.approx(0.2)
    assert result["lef_distribution"].shape == (3,)

    with pytest.raises(ValueError):
        LEF().simulate(lambda_samples, vulnerability=1.2, escalation_prob=0.2)
    with pytest.raises(ValueError):
        LEF().simulate(lambda_samples, vulnerability=0.5, escalation_prob=-0.1)


def test_control_inference_and_engine_cover_inferred_and_user_blended_paths():
    context = fair_context()
    inferred = ControlInference().compute(context)
    inferred_only = ControlEngine().compute(
        {key: value for key, value in context.items() if not key.endswith("_maturity")}
    )
    blended = ControlEngine().compute(context)

    assert 0.0 <= inferred <= 1.0
    assert inferred_only == pytest.approx(inferred)
    assert 0.0 <= blended <= 1.0
    assert blended != pytest.approx(inferred)
    assert ControlEngine()._user_confidence({f"x{i}_maturity": 1 for i in range(20)}) == 1.0
    assert ControlScoring().compute({}) == 0.0


def test_vulnerability_models_are_bounded_and_context_sensitive():
    low_tcap = ThreatCapabilityModel(epss=-1.0, is_kev=False)
    high_tcap = ThreatCapabilityModel(epss=2.0, is_kev=True)
    assert low_tcap.epss == 0.01
    assert high_tcap.epss == 0.99
    assert high_tcap.sample(1000).mean() > low_tcap.sample(1000).mean()

    resistance = ResistanceStrengthModel().sample(control_score=2.0, iterations=1000)
    assert resistance.mean() > 0

    result = VulnerabilityEngine().compute(fair_context(), iterations=1000)
    assert 0.0 <= result["control_score"] <= 1.0
    assert 0.0 <= result["vulnerability"] <= 1.0


def test_frequency_engine_returns_tef_vulnerability_control_and_lef_results():
    result = FrequencyEngine(seed=42).simulate(fair_context(), iterations=1000)

    assert result["tef"]["tef_mean"] >= 0
    assert 0.0 <= result["vulnerability"] <= 1.0
    assert 0.0 <= result["control_score"] <= 1.0
    assert result["lef"]["lef_distribution"].shape == (1000,)
    assert FrequencyEngine()._derive_escalation_probability(
        fair_context(is_kev=True)
    ) > FrequencyEngine()._derive_escalation_probability(fair_context(is_kev=False))


def test_lm_uses_requested_means_and_handles_zero_loss_means():
    zero = LM(seed=42).simulate(
        fair_context(primary_loss_mean=0, secondary_loss_mean=0),
        iterations=1000,
    )
    assert zero["primary_mean"] == 0.0
    assert zero["secondary_mean"] == 0.0
    assert np.all(zero["lm_distribution"] == 0.0)

    result = LM(seed=42).simulate(fair_context(), iterations=5000)
    assert result["primary_mean"] == pytest.approx(20000, rel=0.15)
    assert result["secondary_mean"] == pytest.approx(5000, rel=0.35)
    assert result["lm_distribution"].shape == (5000,)
    assert 0.0 <= LM()._derive_secondary_trigger_probability(fair_context()) <= 1.0


def test_lm_fallback_loss_paths_use_service_value_and_context():
    context = fair_context(service_value=100000)
    context.pop("primary_loss_mean")
    context.pop("secondary_loss_mean")

    result = LM(seed=42).simulate(context, iterations=1000)

    assert result["primary_mean"] > 0
    assert result["secondary_mean"] >= 0
    assert result["lm_mean"] >= result["primary_mean"]

    zero_service = dict(context, service_value=0)
    assert np.all(LM(seed=42)._simulate_secondary_loss(zero_service, 100) == 0.0)

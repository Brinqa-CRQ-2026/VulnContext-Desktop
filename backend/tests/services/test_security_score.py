import pytest

from app.services.security_score import (
    DEFAULT_CONTROL_ANSWERS,
    bounded_maturity,
    compute_confidence,
    compute_domain_scores,
    compute_security_score,
    flatten_control_answers,
    normalize_control_answers,
)


def test_normalize_control_answers_accepts_nested_and_flat_answers_with_bounds():
    normalized = normalize_control_answers(
        {
            "prevent": {
                "patch_maturity": "5",
                "mfa_maturity": -1,
                "segmentation_maturity": 9,
                "hardening_maturity": "invalid",
            },
            "detect_logging_maturity": 2,
            "detect": "invalid-domain",
        }
    )

    assert normalized["prevent"] == {
        "patch_maturity": 5,
        "mfa_maturity": 0,
        "segmentation_maturity": 5,
        "hardening_maturity": DEFAULT_CONTROL_ANSWERS["prevent"]["hardening_maturity"],
    }
    assert normalized["detect"]["logging_maturity"] == 2
    assert normalized["detect"]["siem_maturity"] == DEFAULT_CONTROL_ANSWERS["detect"]["siem_maturity"]
    assert normalized["contain"] == DEFAULT_CONTROL_ANSWERS["contain"]


def test_compute_security_score_includes_domain_scores_confidence_and_flat_context():
    answers = {
        "prevent": {
            "patch_maturity": 5,
            "mfa_maturity": 5,
            "segmentation_maturity": 5,
            "hardening_maturity": 5,
        },
        "detect": {
            "logging_maturity": 0,
            "siem_maturity": 0,
            "speed_maturity": 0,
        },
    }

    result = compute_security_score(answers)

    assert 0.0 <= result["control_score"] <= 1.0
    assert result["confidence"] == pytest.approx(7 / 13)
    assert result["prevent_score"] == 1.0
    assert result["detect_score"] == 0.0
    assert result["respond_score"] == pytest.approx(
        sum(DEFAULT_CONTROL_ANSWERS["respond"].values()) / 15
    )
    assert result["flat_context"]["prevent_patch_maturity"] == 5
    assert result["flat_context"]["detect_logging_maturity"] == 0


def test_control_score_helpers_are_bounded_and_deterministic():
    normalized = DEFAULT_CONTROL_ANSWERS
    flat = flatten_control_answers(normalized)
    domain_scores = compute_domain_scores(normalized)

    assert flat["contain_data_maturity"] == 5
    assert domain_scores["prevent"] == pytest.approx(0.8)
    assert domain_scores["detect"] == pytest.approx(10 / 15)
    assert compute_confidence({}) == 0.0
    assert compute_confidence(normalized) == 1.0
    assert bounded_maturity(None, 3) == 3
    assert bounded_maturity("bad", 4) == 4
    assert bounded_maturity(-10, 3) == 0
    assert bounded_maturity(99, 3) == 5

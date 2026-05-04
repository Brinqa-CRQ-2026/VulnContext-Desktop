from __future__ import annotations

from typing import Any

from app.services.fair.controls.control_scoring import ControlScoring


DEFAULT_CONTROL_ANSWERS: dict[str, dict[str, int]] = {
    "prevent": {
        "patch_maturity": 4,
        "mfa_maturity": 5,
        "segmentation_maturity": 3,
        "hardening_maturity": 4,
    },
    "detect": {
        "logging_maturity": 3,
        "siem_maturity": 4,
        "speed_maturity": 3,
    },
    "respond": {
        "plan_maturity": 4,
        "speed_maturity": 3,
        "automation_maturity": 2,
    },
    "contain": {
        "edr_maturity": 4,
        "privilege_maturity": 3,
        "data_maturity": 5,
    },
}


def compute_control_questionnaire(answers: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_control_answers(answers)
    flat_context = flatten_control_answers(normalized)
    domain_scores = compute_domain_scores(normalized)

    return {
        "control_score": ControlScoring().compute(flat_context),
        "confidence": compute_confidence(answers),
        "prevent_score": domain_scores["prevent"],
        "detect_score": domain_scores["detect"],
        "respond_score": domain_scores["respond"],
        "contain_score": domain_scores["contain"],
        "answers": normalized,
        "flat_context": flat_context,
    }


def normalize_control_answers(answers: dict[str, Any]) -> dict[str, dict[str, int]]:
    normalized: dict[str, dict[str, int]] = {}

    for domain, defaults in DEFAULT_CONTROL_ANSWERS.items():
        raw_domain = answers.get(domain, {})
        if not isinstance(raw_domain, dict):
            raw_domain = {}

        normalized[domain] = {}
        for key, fallback in defaults.items():
            raw_value = raw_domain.get(key, answers.get(f"{domain}_{key}", fallback))
            normalized[domain][key] = bounded_maturity(raw_value, fallback)

    return normalized


def flatten_control_answers(answers: dict[str, dict[str, int]]) -> dict[str, int]:
    return {
        f"{domain}_{key}": value
        for domain, domain_answers in answers.items()
        for key, value in domain_answers.items()
    }


def compute_domain_scores(answers: dict[str, dict[str, int]]) -> dict[str, float]:
    return {
        domain: sum(domain_answers.values()) / (len(domain_answers) * 5.0)
        for domain, domain_answers in answers.items()
        if domain_answers
    }


def compute_confidence(raw_answers: dict[str, Any]) -> float:
    answered = 0
    expected = sum(len(domain_answers) for domain_answers in DEFAULT_CONTROL_ANSWERS.values())

    for domain, defaults in DEFAULT_CONTROL_ANSWERS.items():
        raw_domain = raw_answers.get(domain, {})
        if not isinstance(raw_domain, dict):
            raw_domain = {}

        for key in defaults:
            if key in raw_domain or f"{domain}_{key}" in raw_answers:
                answered += 1

    return min(answered / expected, 1.0) if expected else 0.0


def bounded_maturity(value: Any, fallback: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        numeric = fallback

    return min(max(numeric, 0), 5)

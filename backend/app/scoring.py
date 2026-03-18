"""
Simplified internal risk scoring for the staged finding model.

The current internal score is based only on data we either already store or can
enrich reliably from a CVE:
- CVSS base score
- EPSS probability
- CISA KEV presence
- asset criticality
- analyst context score
"""

from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional, Tuple

from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights


@dataclass(frozen=True)
class RiskAssessment:
    risk_score: float
    risk_band: str
    risk_raw: float


def _band_from_score_100(risk_score: float) -> str:
    if risk_score >= 85:
        return "Critical"
    if risk_score >= 65:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def _max_band(current: str, minimum: str) -> str:
    order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    return current if order.get(current, 1) >= order.get(minimum, 1) else minimum


def _asset_crit_norm_from_label(label: str | None) -> float:
    crit_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
    return crit_map.get((label or "medium").strip().lower(), 0.5)


def _asset_crit_norm_from_numeric(value: int | None) -> float:
    if value is None:
        return 0.5
    return max(0.0, min(1.0, float(value) / 4.0))


def _normalize_context_score(value: float | None) -> float:
    if value is None:
        return 0.0
    if value <= 1.0:
        return max(0.0, value)
    return max(0.0, min(1.0, value / 100.0))


def compute_risk_assessment(
    *,
    cvss_score: float | None,
    epss_score: float | None,
    asset_criticality_label: str | None = None,
    asset_criticality: int | None = None,
    context_score: float | None = None,
    is_kev: bool = False,
    weights: Optional[RiskWeights] = None,
) -> RiskAssessment:
    """
    Compute a 0-100 internal risk score from the current minimal signal set.

    Missing values are treated as absent signal rather than hard failures so the
    app can score partially enriched findings.
    """
    cvss_norm = max(0.0, min(1.0, float(cvss_score or 0.0) / 10.0))
    epss_norm = max(0.0, min(1.0, float(epss_score or 0.0)))
    kev_norm = 1.0 if is_kev else 0.0
    context_norm = _normalize_context_score(context_score)

    if asset_criticality is not None:
        crit_norm = _asset_crit_norm_from_numeric(asset_criticality)
    else:
        crit_norm = _asset_crit_norm_from_label(asset_criticality_label)

    applied_weights = weights or DEFAULT_RISK_WEIGHTS
    base_score = (
        applied_weights["cvss_weight"] * cvss_norm
        + applied_weights["epss_weight"] * epss_norm
        + applied_weights["kev_weight"] * kev_norm
        + applied_weights["asset_criticality_weight"] * crit_norm
        + applied_weights["context_weight"] * context_norm
    )
    risk_raw = max(0.0, min(1.0, base_score))
    risk_score = round(risk_raw * 100.0, 1)

    risk_band = _band_from_score_100(risk_score)
    if is_kev:
        risk_band = _max_band(risk_band, "High")

    return RiskAssessment(risk_score=risk_score, risk_band=risk_band, risk_raw=risk_raw)


def compute_risk_score_and_band(
    *,
    cvss_score: float | None,
    epss_score: float | None,
    asset_criticality_label: str | None = None,
    asset_criticality: int | None = None,
    context_score: float | None = None,
    is_kev: bool = False,
    weights: Optional[RiskWeights] = None,
) -> Tuple[float, str]:
    assessment = compute_risk_assessment(
        cvss_score=cvss_score,
        epss_score=epss_score,
        asset_criticality_label=asset_criticality_label,
        asset_criticality=asset_criticality,
        context_score=context_score,
        is_kev=is_kev,
        weights=weights,
    )
    return assessment.risk_score, assessment.risk_band


def _compute_risk_for_row(
    finding: Mapping[str, Any],
    *,
    weights: Optional[RiskWeights] = None,
) -> Dict[str, Any]:
    assessment = compute_risk_assessment(
        cvss_score=finding.get("cvss_score"),
        epss_score=finding.get("epss_score"),
        asset_criticality_label=finding.get("asset_criticality_label"),
        asset_criticality=(
            int(finding["asset_criticality"])
            if finding.get("asset_criticality") is not None
            else None
        ),
        context_score=finding.get("context_score"),
        is_kev=bool(finding.get("is_kev", False)),
        weights=weights,
    )

    out = dict(finding)
    out["internal_risk_score"] = float(assessment.risk_score)
    out["internal_risk_band"] = assessment.risk_band
    return out


def score_finding_dict(
    finding: Mapping[str, Any],
    *,
    override_risk_score: Optional[float] = None,
    override_risk_band: Optional[str] = None,
    weights: Optional[RiskWeights] = None,
) -> Dict[str, Any]:
    scored = _compute_risk_for_row(finding, weights=weights)

    if override_risk_score is not None:
        scored["internal_risk_score"] = float(override_risk_score)
    if override_risk_band is not None:
        scored["internal_risk_band"] = override_risk_band

    return scored


def score_dataframe(df):
    try:
        import pandas as pd  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "pandas is required for score_dataframe but is not installed"
        ) from exc

    def _apply(row: "pd.Series"):
        return _compute_risk_for_row(row.to_dict())

    scored_rows = df.apply(_apply, axis=1, result_type="expand")
    return pd.DataFrame(scored_rows)

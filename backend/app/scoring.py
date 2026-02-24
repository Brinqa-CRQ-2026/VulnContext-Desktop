"""
Canonical context-aware risk scoring logic for VulnContext.

The current model is still local-first and explainable:
- weighted base score from CVSS/EPSS/exposure/asset criticality/age/auth
- KEV boost/override for known exploited vulnerabilities
- EPSS threshold floors for non-KEV triage consistency
"""

from dataclasses import dataclass
from typing import Any, Dict, Mapping, Tuple, Optional

from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights


@dataclass(frozen=True)
class RiskAssessment:
    risk_score: float
    risk_band: str
    sla_hours: int | None
    risk_raw: float


def _band_from_score_100(risk_score: float) -> str:
    if risk_score >= 80:
        return "Critical"
    if risk_score >= 60:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def _max_band(current: str, minimum: str) -> str:
    order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    return current if order.get(current, 1) >= order.get(minimum, 1) else minimum


def _asset_crit_norm_from_label(label: str) -> float:
    crit_map = {"Low": 0.25, "Medium": 0.5, "High": 0.75, "Critical": 1.0}
    return crit_map.get(label, 0.5)


def _asset_crit_norm_from_numeric(value: int) -> float:
    # App uses a 1-4 scale today (Low..Critical), so divide by 4 rather than 5.
    return max(0.0, min(1.0, float(value) / 4.0))


def compute_risk_assessment(
    *,
    cvss_score: float,
    epss_score: float,
    internet_exposed: bool,
    asset_criticality_label: str | None = None,
    asset_criticality: int | None = None,
    vuln_age_days: int,
    auth_required: bool,
    is_kev: bool = False,
    weights: Optional[RiskWeights] = None,
) -> RiskAssessment:
    """
    Compute risk score/band with KEV and EPSS triage floors.

    Returns 0-100 score to preserve existing API/UI behavior, while keeping
    `risk_raw` internally in [0, 1] for easier tuning.
    """
    cvss_norm = max(0.0, min(1.0, float(cvss_score) / 10.0))
    epss_norm = max(0.0, min(1.0, epss_score))
    age_clamped = max(0, min(365, vuln_age_days))
    age_norm = age_clamped / 365.0
    internet_exposed_norm = 1 if internet_exposed else 0
    auth_norm = 1 if auth_required else 0

    if asset_criticality is not None:
        crit_norm = _asset_crit_norm_from_numeric(int(asset_criticality))
    else:
        crit_norm = _asset_crit_norm_from_label(asset_criticality_label or "Medium")

    applied_weights = weights or DEFAULT_RISK_WEIGHTS

    base_score = (
        applied_weights["cvss_weight"] * cvss_norm
        + applied_weights["epss_weight"] * epss_norm
        + applied_weights["internet_exposed_weight"] * internet_exposed_norm
        + applied_weights["asset_criticality_weight"] * crit_norm
        + applied_weights["vuln_age_weight"] * age_norm
        + applied_weights["auth_required_weight"] * auth_norm
    )
    base_score = max(0.0, min(1.0, base_score))

    sla_hours: int | None = None
    if is_kev:
        risk_raw = min(1.0, base_score + 0.25)
        risk_band = "Critical"
        asset_crit_value = int(asset_criticality or 0)
        sla_hours = 24 if asset_crit_value >= 4 else 72
    else:
        risk_raw = base_score
        risk_band = _band_from_score_100(risk_raw * 100.0)
        if epss_norm >= 0.95:
            risk_band = _max_band(risk_band, "High")
        elif epss_norm >= 0.80:
            risk_band = _max_band(risk_band, "Medium")

    risk_score = round(risk_raw * 100.0, 1)
    return RiskAssessment(
        risk_score=risk_score,
        risk_band=risk_band,
        sla_hours=sla_hours,
        risk_raw=risk_raw,
    )


def compute_risk_score_and_band(
    *,
    cvss_score: float,
    epss_score: float,
    internet_exposed: bool,
    asset_criticality_label: str,
    vuln_age_days: int,
    auth_required: bool,
    is_kev: bool = False,
    asset_criticality: int | None = None,
    weights: Optional[RiskWeights] = None,
) -> Tuple[float, str]:
    assessment = compute_risk_assessment(
        cvss_score=cvss_score,
        epss_score=epss_score,
        internet_exposed=internet_exposed,
        asset_criticality_label=asset_criticality_label,
        asset_criticality=asset_criticality,
        vuln_age_days=vuln_age_days,
        auth_required=auth_required,
        is_kev=is_kev,
        weights=weights,
    )
    return assessment.risk_score, assessment.risk_band


def _compute_risk_for_row(
    finding: Mapping[str, Any],
    *,
    weights: Optional[RiskWeights] = None,
) -> Dict[str, Any]:
    """
    Thin adapter: takes a dict-like finding and attaches risk_score + risk_band.
    """

    cvss = float(finding.get("cvss_score", 0.0))
    epss = float(finding.get("epss_score", 0.0))
    internet_exposed = bool(finding.get("internet_exposed", False))

    # These three fields must come from the caller (seed, POST /scores, etc.)
    asset_crit_label_raw = finding.get(
        "asset_criticality_label",
        finding.get("asset_criticality", "Medium"),
    )
    if isinstance(asset_crit_label_raw, (int, float)):
        numeric_map = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
        asset_crit_label = numeric_map.get(int(asset_crit_label_raw), "Medium")
    else:
        asset_crit_label = str(asset_crit_label_raw)
    vuln_age_days = int(finding.get("vuln_age_days", 0))
    auth_required = bool(finding.get("auth_required", False))

    assessment = compute_risk_assessment(
        cvss_score=cvss,
        epss_score=epss,
        internet_exposed=internet_exposed,
        asset_criticality_label=asset_crit_label,
        asset_criticality=int(finding.get("asset_criticality", 2) or 2),
        vuln_age_days=vuln_age_days,
        auth_required=auth_required,
        is_kev=bool(finding.get("is_kev", False)),
        weights=weights,
    )

    out = dict(finding)
    out["risk_score"] = float(assessment.risk_score)
    out["risk_band"] = assessment.risk_band
    out["sla_hours"] = assessment.sla_hours
    return out


def score_finding_dict(
    finding: Mapping[str, Any],
    *,
    override_risk_score: Optional[float] = None,
    override_risk_band: Optional[str] = None,
    weights: Optional[RiskWeights] = None,
) -> Dict[str, Any]:
    """
    Public API: score a single finding dict.

    - Takes an input mapping (dict or Pydantic model .dict()).
    - Computes risk_score & risk_band using _compute_risk_for_row.
    - Allows override of risk_score/risk_band if ingesting pre-scored CSV.
    """
    scored = _compute_risk_for_row(finding, weights=weights)

    if override_risk_score is not None:
        scored["risk_score"] = float(override_risk_score)
    if override_risk_band is not None:
        scored["risk_band"] = override_risk_band

    return scored


def score_dataframe(df):
    """
    Convenience for batch scoring with pandas.

    This lets risk_scoring_v1.py or notebooks reuse the same logic.

    Usage:
        import pandas as pd
        from app.scoring import score_dataframe

        df_raw = pd.read_csv("...")
        df_scored = score_dataframe(df_raw)
    """
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

"""
scoring.py

Canonical context-aware risk scoring logic for VulnContext.

This mirrors the compute_risk(...) function from risk_scoring_v1.py,
but operates on a single "finding" dict instead of a whole DataFrame.
"""

from typing import Any, Dict, Mapping, Tuple, Optional

from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights


def compute_risk_score_and_band(
    *,
    cvss_score: float,
    epss_score: float,
    internet_exposed: bool,
    asset_criticality_label: str,
    vuln_age_days: int,
    auth_required: bool,
    weights: Optional[RiskWeights] = None,
) -> Tuple[float, str]:
    """
    Compute risk_score and risk_band for a single finding.

    This is a direct per-row translation of your original compute_risk logic.
    """

    # ---- Normalizations ----

    # CVSS base score in [0, 10]
    cvss_norm = cvss_score / 10.0

    # EPSS already in [0, 1]
    epss_norm = max(0.0, min(1.0, epss_score))

    # Age: cap at 1 year (365 days)
    age_clamped = max(0, min(365, vuln_age_days))
    age_norm = age_clamped / 365.0

    # Booleans as 0/1
    internet_exposed_norm = 1 if internet_exposed else 0
    auth_norm = 1 if auth_required else 0

    # Asset criticality mapping
    crit_map = {"Low": 0.25, "Medium": 0.5, "High": 0.75, "Critical": 1.0}
    asset_crit_norm = crit_map.get(asset_criticality_label, 0.5)

    applied_weights = weights or DEFAULT_RISK_WEIGHTS

    # ---- Weighted risk score ----
    risk_raw = (
        applied_weights["cvss_weight"] * cvss_norm
        + applied_weights["epss_weight"] * epss_norm
        + applied_weights["internet_exposed_weight"] * internet_exposed_norm
        + applied_weights["asset_criticality_weight"] * asset_crit_norm
        + applied_weights["vuln_age_weight"] * age_norm
        + applied_weights["auth_required_weight"] * auth_norm
    )

    # Clamp to [0, 1]
    risk_raw = max(0.0, min(1.0, risk_raw))

    # Convert to 0–100 and round to 1 decimal
    risk_score = round(risk_raw * 100.0, 1)

    # ---- Risk bands ----
    if risk_score >= 80:
        risk_band = "Critical"
    elif risk_score >= 60:
        risk_band = "High"
    elif risk_score >= 40:
        risk_band = "Medium"
    else:
        risk_band = "Low"

    return risk_score, risk_band


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

    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=cvss,
        epss_score=epss,
        internet_exposed=internet_exposed,
        asset_criticality_label=asset_crit_label,
        vuln_age_days=vuln_age_days,
        auth_required=auth_required,
        weights=weights,
    )

    out = dict(finding)
    out["risk_score"] = float(risk_score)
    out["risk_band"] = risk_band
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

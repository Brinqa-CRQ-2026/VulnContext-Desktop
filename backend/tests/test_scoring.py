from app.scoring import compute_risk_score_and_band, score_finding_dict


def test_compute_risk_score_and_band_max_critical():
    """Verifies strongest inputs clamp to the maximum score and Critical band."""
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=10.0,
        epss_score=1.0,
        internet_exposed=True,
        asset_criticality_label="Critical",
        vuln_age_days=365,
        auth_required=False,
    )

    assert risk_score == 100.0
    assert risk_band == "Critical"


def test_compute_risk_score_and_band_auth_required_reduces_score():
    """Ensures enabling auth_required decreases risk for otherwise identical input."""
    without_auth_score, _ = compute_risk_score_and_band(
        cvss_score=9.0,
        epss_score=0.8,
        internet_exposed=True,
        asset_criticality_label="High",
        vuln_age_days=90,
        auth_required=False,
    )
    with_auth_score, _ = compute_risk_score_and_band(
        cvss_score=9.0,
        epss_score=0.8,
        internet_exposed=True,
        asset_criticality_label="High",
        vuln_age_days=90,
        auth_required=True,
    )

    assert with_auth_score < without_auth_score


def test_compute_risk_score_and_band_clamps_bounds():
    """Checks out-of-range/unknown inputs still produce valid bounded output."""
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=9.5,
        epss_score=2.5,
        internet_exposed=False,
        asset_criticality_label="UnknownLabel",
        vuln_age_days=9999,
        auth_required=True,
    )

    assert 0.0 <= risk_score <= 100.0
    assert risk_band in {"Low", "Medium", "High", "Critical"}


def test_compute_risk_score_and_band_threshold_40_is_medium():
    """Ensures exact 40.0 score maps to Medium (inclusive threshold)."""
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=10.0,
        epss_score=0.25,
        internet_exposed=False,
        asset_criticality_label="Low",
        vuln_age_days=0,
        auth_required=False,
    )

    assert risk_score == 40.0
    assert risk_band == "Medium"


def test_compute_risk_score_and_band_threshold_60_is_high():
    """Ensures exact 60.0 score maps to High (inclusive threshold)."""
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=10.0,
        epss_score=0.9,
        internet_exposed=False,
        asset_criticality_label="Medium",
        vuln_age_days=0,
        auth_required=False,
    )

    assert risk_score == 60.0
    assert risk_band == "High"


def test_compute_risk_score_and_band_threshold_80_is_critical():
    """Ensures exact 80.0 score maps to Critical (inclusive threshold)."""
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=5.0,
        epss_score=0.8,
        internet_exposed=True,
        asset_criticality_label="Critical",
        vuln_age_days=365,
        auth_required=False,
    )

    assert risk_score == 80.0
    assert risk_band == "Critical"


def test_compute_risk_score_and_band_negative_epss_clamps_to_zero():
    """Verifies EPSS < 0 behaves like EPSS == 0 due to clamping."""
    score_negative, band_negative = compute_risk_score_and_band(
        cvss_score=7.5,
        epss_score=-0.5,
        internet_exposed=True,
        asset_criticality_label="High",
        vuln_age_days=20,
        auth_required=False,
    )
    score_zero, band_zero = compute_risk_score_and_band(
        cvss_score=7.5,
        epss_score=0.0,
        internet_exposed=True,
        asset_criticality_label="High",
        vuln_age_days=20,
        auth_required=False,
    )

    assert score_negative == score_zero
    assert band_negative == band_zero


def test_compute_risk_score_and_band_negative_age_clamps_to_zero():
    """Verifies age < 0 behaves like age == 0 due to clamping."""
    score_negative_age, band_negative_age = compute_risk_score_and_band(
        cvss_score=6.0,
        epss_score=0.3,
        internet_exposed=False,
        asset_criticality_label="Medium",
        vuln_age_days=-10,
        auth_required=False,
    )
    score_zero_age, band_zero_age = compute_risk_score_and_band(
        cvss_score=6.0,
        epss_score=0.3,
        internet_exposed=False,
        asset_criticality_label="Medium",
        vuln_age_days=0,
        auth_required=False,
    )

    assert score_negative_age == score_zero_age
    assert band_negative_age == band_zero_age


def test_score_finding_dict_adds_computed_fields():
    """Confirms score_finding_dict appends computed risk_score and risk_band."""
    finding = {
        "finding_id": "F-1",
        "asset_id": "A-1",
        "cvss_score": 8.1,
        "epss_score": 0.42,
        "internet_exposed": True,
        "asset_criticality_label": "High",
        "vuln_age_days": 30,
        "auth_required": False,
    }

    scored = score_finding_dict(finding)

    assert "risk_score" in scored
    assert "risk_band" in scored
    assert isinstance(scored["risk_score"], float)
    assert scored["risk_band"] in {"Low", "Medium", "High", "Critical"}


def test_score_finding_dict_allows_overrides():
    """Confirms explicit override values replace computed score and band."""
    finding = {
        "finding_id": "F-2",
        "asset_id": "A-2",
        "cvss_score": 3.2,
        "epss_score": 0.01,
        "internet_exposed": False,
        "asset_criticality_label": "Low",
        "vuln_age_days": 5,
        "auth_required": True,
    }

    scored = score_finding_dict(
        finding,
        override_risk_score=77.7,
        override_risk_band="High",
    )

    assert scored["risk_score"] == 77.7
    assert scored["risk_band"] == "High"

from app.scoring import compute_risk_assessment


def test_kev_finding_gets_boost_and_critical_band_with_sla():
    non_kev = compute_risk_assessment(
        cvss_score=5.0,
        epss_score=0.20,
        internet_exposed=True,
        asset_criticality=3,
        asset_criticality_label="High",
        vuln_age_days=15,
        auth_required=False,
        is_kev=False,
    )
    kev = compute_risk_assessment(
        cvss_score=5.0,
        epss_score=0.20,
        internet_exposed=True,
        asset_criticality=4,
        asset_criticality_label="Critical",
        vuln_age_days=15,
        auth_required=False,
        is_kev=True,
    )

    assert kev.risk_score > non_kev.risk_score
    assert kev.risk_band == "Critical"
    assert kev.sla_hours == 24


def test_non_kev_high_epss_floor_raises_band_to_high():
    result = compute_risk_assessment(
        cvss_score=3.5,
        epss_score=0.96,
        internet_exposed=False,
        asset_criticality=1,
        asset_criticality_label="Low",
        vuln_age_days=1,
        auth_required=True,
        is_kev=False,
    )
    low_epss = compute_risk_assessment(
        cvss_score=3.5,
        epss_score=0.05,
        internet_exposed=False,
        asset_criticality=1,
        asset_criticality_label="Low",
        vuln_age_days=1,
        auth_required=True,
        is_kev=False,
    )

    assert result.risk_band in {"High", "Critical"}
    assert result.risk_score > low_epss.risk_score

from app.scoring import compute_risk_assessment


def test_kev_signal_increases_score():
    non_kev = compute_risk_assessment(
        cvss_score=5.0,
        epss_score=0.20,
        asset_criticality=3,
        context_score=0.0,
        is_kev=False,
    )
    kev = compute_risk_assessment(
        cvss_score=5.0,
        epss_score=0.20,
        asset_criticality=3,
        context_score=0.0,
        is_kev=True,
    )

    assert kev.risk_score > non_kev.risk_score
    assert kev.risk_band in {"High", "Critical"}


def test_epss_signal_increases_score():
    low_epss = compute_risk_assessment(
        cvss_score=6.0,
        epss_score=0.05,
        asset_criticality=2,
        context_score=0.0,
        is_kev=False,
    )
    high_epss = compute_risk_assessment(
        cvss_score=6.0,
        epss_score=0.95,
        asset_criticality=2,
        context_score=0.0,
        is_kev=False,
    )

    assert high_epss.risk_score > low_epss.risk_score

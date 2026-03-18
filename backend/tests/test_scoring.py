from app.scoring import compute_risk_score_and_band, score_finding_dict


def test_compute_risk_score_and_band_max_critical():
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=10.0,
        epss_score=1.0,
        asset_criticality_label="Critical",
        context_score=1.0,
        is_kev=True,
    )

    assert risk_score == 100.0
    assert risk_band == "Critical"


def test_compute_risk_score_and_band_missing_signals_stays_bounded():
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=None,
        epss_score=None,
        asset_criticality_label=None,
        context_score=None,
        is_kev=False,
    )

    assert 0.0 <= risk_score <= 100.0
    assert risk_band in {"Low", "Medium", "High", "Critical"}


def test_compute_risk_score_and_band_context_increases_score():
    without_context_score, _ = compute_risk_score_and_band(
        cvss_score=7.0,
        epss_score=0.2,
        asset_criticality_label="High",
        context_score=0.0,
        is_kev=False,
    )
    with_context_score, _ = compute_risk_score_and_band(
        cvss_score=7.0,
        epss_score=0.2,
        asset_criticality_label="High",
        context_score=1.0,
        is_kev=False,
    )

    assert with_context_score > without_context_score


def test_compute_risk_score_and_band_numeric_asset_criticality_supported():
    risk_score, risk_band = compute_risk_score_and_band(
        cvss_score=8.5,
        epss_score=0.5,
        asset_criticality=4,
        context_score=0.25,
        is_kev=False,
    )

    assert risk_score > 0.0
    assert risk_band in {"Medium", "High", "Critical"}


def test_score_finding_dict_sets_internal_risk_fields():
    finding = {
        "uid": "uid-1",
        "cve_id": "CVE-2024-0001",
        "cvss_score": 8.1,
        "epss_score": 0.42,
        "asset_criticality": 3,
        "context_score": 0.15,
        "is_kev": True,
    }

    scored = score_finding_dict(finding)

    assert "internal_risk_score" in scored
    assert "internal_risk_band" in scored
    assert isinstance(scored["internal_risk_score"], float)
    assert scored["internal_risk_band"] in {"Low", "Medium", "High", "Critical"}


def test_score_finding_dict_allows_overrides():
    finding = {
        "uid": "uid-2",
        "cve_id": "CVE-2024-0002",
        "cvss_score": 3.2,
        "epss_score": 0.01,
        "asset_criticality": 1,
        "context_score": 0.0,
        "is_kev": False,
    }

    scored = score_finding_dict(
        finding,
        override_risk_score=77.7,
        override_risk_band="High",
    )

    assert scored["internal_risk_score"] == 77.7
    assert scored["internal_risk_band"] == "High"

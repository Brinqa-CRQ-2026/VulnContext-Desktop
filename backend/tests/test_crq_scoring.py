from datetime import datetime, timezone

import pytest

from app import models
from app.services.crq_finding_scoring import CRQ_VERSION, preview_scores, score_findings


def seed_finding(db_session, *, idx: int, age_in_days: float | None, cve_id: str):
    asset = models.Asset(asset_id=f"asset-{idx}", hostname=f"host-{idx}")
    finding = models.Finding(
        id=idx,
        asset_id=asset.asset_id,
        finding_id=f"finding-{idx}",
        finding_uid=f"uid-{idx}",
        finding_name=f"Finding {idx}",
        status="Confirmed active",
        cve_id=cve_id,
        brinqa_risk_score=1.0,
        age_in_days=age_in_days,
        date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
    )
    db_session.add(asset)
    db_session.add(finding)
    db_session.commit()
    return finding


def test_crq_scoring_persists_expected_values_and_boundaries(db_session):
    finding_full = seed_finding(db_session, idx=1, age_in_days=30, cve_id="CVE-2024-0001")
    finding_epss_only = seed_finding(db_session, idx=2, age_in_days=90, cve_id="CVE-2024-0002")
    finding_nvd_only = seed_finding(db_session, idx=3, age_in_days=180, cve_id="CVE-2024-0003")
    finding_missing_epss = seed_finding(db_session, idx=4, age_in_days=181, cve_id="CVE-2024-0004")
    finding_missing_age = seed_finding(db_session, idx=5, age_in_days=None, cve_id="CVE-2024-0005")
    finding_missing_cvss = seed_finding(db_session, idx=6, age_in_days=10, cve_id="CVE-2024-9999")

    db_session.add_all(
        [
            models.NvdRecord(cve="CVE-2024-0001", cvss_score=7.0, cvss_severity="High"),
            models.NvdRecord(cve="CVE-2024-0002", cvss_score=7.0, cvss_severity="High"),
            models.NvdRecord(cve="CVE-2024-0003", cvss_score=7.0, cvss_severity="High"),
            models.NvdRecord(cve="CVE-2024-0004", cvss_score=9.9, cvss_severity="Critical"),
            models.NvdRecord(cve="CVE-2024-0005", cvss_score=4.0, cvss_severity="Medium"),
        ]
    )
    db_session.add_all(
        [
            models.EPSSScore(cve="CVE-2024-0001", epss=0.91, percentile=0.50),
            models.EPSSScore(cve="CVE-2024-0002", epss=0.92, percentile=0.80),
            models.EPSSScore(cve="CVE-2024-0003", epss=0.93, percentile=0.95),
            models.EPSSScore(cve="CVE-2024-0005", epss=0.94, percentile=0.99),
        ]
    )
    db_session.add(models.KevRecord(cve="CVE-2024-0001", date_added="2024-01-10"))
    db_session.commit()

    preview = preview_scores(db_session)
    preview_by_id = {row["finding_id"]: row for row in preview}
    assert preview_by_id["finding-1"]["crq_finding_epss_multiplier"] == 0.0
    assert preview_by_id["finding-2"]["crq_finding_epss_multiplier"] == 0.35
    assert preview_by_id["finding-3"]["crq_finding_epss_multiplier"] == 0.75
    assert preview_by_id["finding-5"]["crq_finding_epss_multiplier"] == 0.75
    assert preview_by_id["finding-4"]["crq_finding_epss_multiplier"] == 0.0

    updated = score_findings(
        db_session,
        scored_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
    )
    assert updated == 6

    refreshed = {
        finding.finding_id: db_session.get(models.Finding, finding.id)
        for finding in (
            finding_full,
            finding_epss_only,
            finding_nvd_only,
            finding_missing_epss,
            finding_missing_age,
            finding_missing_cvss,
        )
    }

    assert refreshed["finding-1"].crq_finding_score == pytest.approx(7.06)
    assert refreshed["finding-1"].crq_finding_risk_band == "High"
    assert refreshed["finding-1"].crq_finding_kev_bonus == pytest.approx(0.9)
    assert refreshed["finding-1"].crq_finding_age_bonus == 0.0

    assert refreshed["finding-2"].crq_finding_score == pytest.approx(6.51)
    assert refreshed["finding-2"].crq_finding_risk_band == "Medium"
    assert refreshed["finding-2"].crq_finding_age_bonus == 0.25

    assert refreshed["finding-3"].crq_finding_score == pytest.approx(6.91)
    assert refreshed["finding-3"].crq_finding_risk_band == "Medium"
    assert refreshed["finding-3"].crq_finding_age_bonus == 0.5

    assert refreshed["finding-4"].crq_finding_score == pytest.approx(8.712)
    assert refreshed["finding-4"].crq_finding_risk_band == "High"
    assert refreshed["finding-4"].crq_finding_age_bonus == 1.0
    assert "Missing EPSS percentile" in refreshed["finding-4"].crq_finding_notes

    assert refreshed["finding-5"].crq_finding_score == pytest.approx(4.27)
    assert refreshed["finding-5"].crq_finding_risk_band == "Medium"
    assert refreshed["finding-5"].crq_finding_age_bonus == 0.0
    assert "Missing age_in_days" in refreshed["finding-5"].crq_finding_notes

    assert refreshed["finding-6"].crq_finding_score == pytest.approx(0.0)
    assert refreshed["finding-6"].crq_finding_risk_band == "Low"
    assert "Missing NVD CVSS" in refreshed["finding-6"].crq_finding_notes

    for finding in refreshed.values():
        assert finding.crq_finding_score_version == CRQ_VERSION
        assert finding.crq_finding_scored_at == datetime(2024, 2, 1, tzinfo=timezone.utc)
        assert finding.crq_finding_score <= 10.0

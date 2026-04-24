from datetime import datetime, timezone

from app import models


def seed_asset_and_finding(
    db_session,
    *,
    idx: int,
    risk: float,
    status: str = "Confirmed active",
    crq_score: float | None = None,
    crq_risk_band: str | None = None,
    crq_is_kev: bool | None = None,
):
    asset = models.Asset(
        asset_id=f"asset-{idx}",
        hostname=f"host-{idx}",
        compliance_status="Out of SLA",
        asset_criticality=3,
    )
    finding = models.Finding(
        id=idx,
        asset_id=asset.asset_id,
        finding_id=f"200{idx}",
        finding_uid=f"uid-{idx}",
        finding_name=f"Finding {idx}",
        status=status,
        cve_id=f"CVE-2024-{idx:04d}",
        brinqa_base_risk_score=max(0.0, risk - 1),
        brinqa_risk_score=risk,
        first_found=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_found=datetime(2024, 1, 15, tzinfo=timezone.utc),
        age_in_days=14.0,
        date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
        crq_score=crq_score,
        crq_risk_band=crq_risk_band,
        crq_score_version="v4" if crq_score is not None else None,
        crq_scored_at=datetime(2024, 1, 21, tzinfo=timezone.utc) if crq_score is not None else None,
        crq_cvss_score=8.8 if crq_score is not None else None,
        crq_epss_score=0.42 if crq_score is not None else None,
        crq_epss_percentile=0.97 if crq_score is not None else None,
        crq_epss_multiplier=0.35 if crq_score is not None else None,
        crq_is_kev=crq_is_kev,
        crq_kev_bonus=0.9 if crq_is_kev else 0.0 if crq_score is not None else None,
        crq_age_days=14.0 if crq_score is not None else None,
        crq_age_bonus=0.0 if crq_score is not None else None,
    )
    db_session.add(asset)
    db_session.add(finding)
    db_session.commit()
    return asset, finding


def test_health_docs_and_openapi_are_available(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_findings_summary_and_list_use_thin_runtime_models(client, db_session):
    seed_asset_and_finding(
        db_session,
        idx=1,
        risk=9.2,
        crq_score=6.5,
        crq_risk_band="Medium",
        crq_is_kev=True,
    )
    seed_asset_and_finding(db_session, idx=2, risk=7.4)
    seed_asset_and_finding(db_session, idx=3, risk=3.8, status="Confirmed fixed")

    summary = client.get("/findings/summary")
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["total_findings"] == 3
    assert payload["risk_bands"]["Medium"] == 1
    assert payload["risk_bands"]["High"] == 1
    assert payload["risk_bands"]["Low"] == 1
    assert payload["kevFindingsTotal"] == 1
    assert payload["kevRiskBands"]["Medium"] == 1

    response = client.get("/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc")
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == ["2002", "2001", "2003"]
    assert items[0]["source"] == "Brinqa"
    assert items[0]["cvss_score"] is None
    assert items[1]["risk_band"] == "Medium"
    assert items[1]["source_risk_band"] == "Critical"
    assert items[1]["score_source"] == "CRQ V4"
    assert items[1]["cvss_score"] == 8.8
    assert items[1]["epss_score"] == 0.42
    assert items[1]["isKev"] is True
    assert items[2]["lifecycle_status"] == "Fixed"


def test_findings_detail_returns_thin_persisted_data_only(client, db_session):
    _, finding = seed_asset_and_finding(
        db_session,
        idx=5,
        risk=8.1,
        crq_score=9.7,
        crq_risk_band="Critical",
        crq_is_kev=True,
    )

    response = client.get(f"/findings/{finding.finding_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "2005"
    assert payload["display_name"] == "Finding 5"
    assert payload["target_names"] == "host-5"
    assert payload["risk_score"] == 9.7
    assert payload["source_risk_score"] == 8.1
    assert payload["crq_score_version"] == "v4"
    assert payload["cvss_score"] == 8.8
    assert payload["epss_score"] == 0.42
    assert payload["crq_epss_multiplier"] == 0.35
    assert payload["crq_is_kev"] is True
    assert payload["summary"] is None
    assert payload["description"] is None
    assert payload["detail_source"] is None or payload["detail_source"] == "local"


def test_sources_summary_is_read_only(client, db_session):
    seed_asset_and_finding(db_session, idx=7, risk=6.0)

    response = client.get("/sources")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source"] == "Brinqa"
    assert payload[0]["total_findings"] == 1

from datetime import datetime, timezone

from app import models
def seed_asset_and_finding(db_session, *, idx: int, risk: float, status: str = "Confirmed active"):
    asset = models.Asset(
        asset_id=f"asset-{idx}",
        hostname=f"host-{idx}",
        compliance_status="Out of SLA",
        asset_criticality=3,
    )
    finding = models.Finding(
        id=idx,
        asset_id=asset.asset_id,
        asset_name=f"Asset {idx}",
        finding_id=f"200{idx}",
        finding_uid=f"uid-{idx}",
        finding_name=f"Finding {idx}",
        status=status,
        cve_id=f"CVE-2024-{idx:04d}",
        cwe_id="CWE-79",
        brinqa_base_risk_score=max(0.0, risk - 1),
        brinqa_risk_score=risk,
        first_found=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_found=datetime(2024, 1, 15, tzinfo=timezone.utc),
        age_in_days=14.0,
        date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
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
    seed_asset_and_finding(db_session, idx=1, risk=9.2)
    seed_asset_and_finding(db_session, idx=2, risk=7.4)
    seed_asset_and_finding(db_session, idx=3, risk=3.8, status="Confirmed fixed")

    summary = client.get("/findings/summary")
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["total_findings"] == 3
    assert payload["risk_bands"]["Critical"] == 1
    assert payload["risk_bands"]["High"] == 1
    assert payload["risk_bands"]["Low"] == 1

    response = client.get("/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc")
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [1, 2, 3]
    assert items[0]["source"] == "Brinqa"
    assert items[0]["risk_band"] == "Critical"
    assert items[2]["lifecycle_status"] == "Fixed"


def test_findings_detail_returns_thin_persisted_data_only(client, db_session):
    _, finding = seed_asset_and_finding(db_session, idx=5, risk=8.1)

    response = client.get(f"/findings/{finding.id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == 5
    assert payload["display_name"] == "Finding 5"
    assert payload["target_names"] == "Asset 5"
    assert payload["summary"] is None
    assert payload["description"] is None
    assert payload["detail_source"] is None


def test_sources_summary_is_read_only(client, db_session):
    seed_asset_and_finding(db_session, idx=7, risk=6.0)

    response = client.get("/sources")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source"] == "Brinqa"
    assert payload[0]["total_findings"] == 1

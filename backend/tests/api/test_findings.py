from helpers.findings import seed_asset_and_finding


def test_health_docs_and_openapi_are_available(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/api/v1/health").status_code == 200


def test_findings_summary_and_list_use_thin_runtime_models(client, db_session):
    seed_asset_and_finding(
        db_session,
        idx=1,
        risk=9.2,
        crq_finding_score=6.5,
        crq_finding_risk_band="Medium",
        crq_finding_is_kev=True,
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

    versioned_summary = client.get("/api/v1/findings/summary")
    assert versioned_summary.status_code == 200

    response = client.get("/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc")
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == ["2002", "2001", "2003"]
    assert items[0]["source"] == "Brinqa"
    assert items[0]["business_service"] == "Business Service 2"
    assert items[0]["application"] == "Application 2"
    assert items[0]["cvss_score"] is None
    assert items[1]["risk_band"] == "Medium"
    assert items[1]["source_risk_band"] == "Critical"
    assert items[1]["score_source"] == "CRQ V4"
    assert items[1]["cvss_score"] == 8.8
    assert items[1]["epss_score"] == 0.42
    assert items[1]["isKev"] is True
    assert items[2]["lifecycle_status"] == "Fixed"

    versioned_response = client.get(
        "/api/v1/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc"
    )
    assert versioned_response.status_code == 200
    versioned_items = versioned_response.json()["items"]
    assert versioned_items[0]["business_service"] == "Business Service 2"
    assert versioned_items[0]["application"] == "Application 2"


def test_findings_detail_returns_thin_persisted_data_only(client, db_session):
    _, finding = seed_asset_and_finding(
        db_session,
        idx=5,
        risk=8.1,
        crq_finding_score=9.7,
        crq_finding_risk_band="Critical",
        crq_finding_is_kev=True,
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
    assert payload["detail_source"] is None

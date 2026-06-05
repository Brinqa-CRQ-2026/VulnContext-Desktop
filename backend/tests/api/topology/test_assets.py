from app import models
from app.api.topology import dependencies as topology_dependencies
from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.topology import seed_asset, seed_topology


def test_assets_routes_preserve_legacy_filters_and_asset_findings_after_fk_expansion(
    client,
    db_session,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-20",
        hostname="asset-20-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[9.0, 2.0],
    )
    seed_asset(
        db_session,
        asset_id="asset-21",
        hostname="asset-21-host",
        business_service="Digital Media",
        application=None,
        finding_risks=[6.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    response = client.get("/assets?business_service=Digital%20Media")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert {item["asset_id"] for item in payload["items"]} == {"asset-20", "asset-21"}

    filtered = client.get(
        "/assets?business_unit=Online%20Store&business_service=Digital%20Media&application=Inventory%20Manager&search=asset-20&sort_by=finding_count&sort_order=desc"
    )
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["asset_id"] == "asset-20"
    assert filtered_payload["items"][0]["finding_count"] == 2

    direct_only = client.get(
        "/assets?business_service=Digital%20Media&direct_only=true"
    )
    assert direct_only.status_code == 200
    assert direct_only.json()["total"] == 1
    assert direct_only.json()["items"][0]["asset_id"] == "asset-21"

    detail = client.get("/assets/asset-20")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["asset_id"] == "asset-20"
    assert detail_payload["business_unit"] == "Online Store"
    assert detail_payload["business_service"] == "Digital Media"
    assert detail_payload["application"] == "Inventory Manager"
    assert detail_payload["finding_count"] == 2
    assert "asset_context_score" in detail_payload
    assert "exposure_score" in detail_payload
    assert "crq_asset_context_score" not in detail_payload
    assert detail_payload["dnsname"] is None
    assert detail_payload["detail_source"] is None

    findings = client.get("/assets/asset-20/findings?page=1&page_size=1&sort_by=risk_score&sort_order=desc")
    assert findings.status_code == 200
    findings_payload = findings.json()
    assert findings_payload["asset"]["asset_id"] == "asset-20"
    assert findings_payload["asset"]["business_service"] == "Digital Media"
    assert findings_payload["total"] == 2
    assert findings_payload["page"] == 1
    assert findings_payload["page_size"] == 1
    assert len(findings_payload["items"]) == 1
    assert all(item["asset_id"] == "asset-20" for item in findings_payload["items"])


def test_asset_findings_analytics_route_summarizes_full_filtered_result_set(
    client,
    db_session,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-analytics",
        hostname="asset-analytics-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[9.1, 8.2, 3.2],
    )
    backfill_asset_topology_foreign_keys(db_session)
    findings = (
        db_session.query(models.Finding)
        .filter(models.Finding.asset_id == "asset-analytics")
        .order_by(models.Finding.finding_id)
        .all()
    )
    findings[0].crq_finding_score = 9.4
    findings[0].crq_finding_risk_band = "Critical"
    findings[0].crq_finding_is_kev = True
    findings[0].crq_finding_cvss_score = 9.8
    findings[0].crq_finding_epss_score = 0.98
    findings[0].crq_finding_epss_percentile = 0.99
    findings[0].age_in_days = 40.0
    findings[1].crq_finding_score = 7.6
    findings[1].crq_finding_risk_band = "High"
    findings[1].crq_finding_is_kev = False
    findings[1].crq_finding_cvss_score = 8.2
    findings[1].crq_finding_epss_score = 0.22
    findings[1].crq_finding_epss_percentile = 0.61
    findings[1].age_in_days = 10.0
    findings[2].crq_finding_score = 2.5
    findings[2].crq_finding_risk_band = "Low"
    findings[2].crq_finding_is_kev = False
    findings[2].crq_finding_cvss_score = 3.1
    findings[2].crq_finding_epss_score = 0.01
    findings[2].crq_finding_epss_percentile = 0.03
    findings[2].age_in_days = 5.0
    db_session.commit()

    response = client.get("/assets/asset-analytics/findings/analytics")
    assert response.status_code == 200
    payload = response.json()
    assert payload["asset"]["asset_id"] == "asset-analytics"
    assert payload["asset"]["business_service"] == "Digital Media"
    assert payload["analytics"]["total_findings"] == 3
    assert payload["analytics"]["kev_findings"] == 1
    assert payload["analytics"]["critical_high_findings"] == 2
    assert payload["analytics"]["highest_risk_band"] == "Critical"
    assert payload["analytics"]["max_risk_score"] == 9.4
    assert payload["analytics"]["oldest_priority_age_days"] == 40.0
    assert payload["analytics"]["risk_bands"] == {
        "Critical": 1,
        "High": 1,
        "Medium": 0,
        "Low": 1,
    }

    filtered = client.get("/assets/asset-analytics/findings/analytics?kev_only=true")
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["analytics"]["total_findings"] == 1
    assert filtered_payload["analytics"]["kev_findings"] == 1
    assert filtered_payload["analytics"]["risk_bands"]["Critical"] == 1


def test_assets_analytics_route_summarizes_full_filtered_asset_set(client, db_session):
    seed_topology(db_session)
    asset_critical = seed_asset(
        db_session,
        asset_id="asset-chart-1",
        hostname="chart-1",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[],
        environment="production",
        status="Confirmed active",
        pci=True,
    )
    asset_high = seed_asset(
        db_session,
        asset_id="asset-chart-2",
        hostname="chart-2",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[],
        environment="production",
        status="Confirmed active",
        pii=True,
    )
    asset_medium = seed_asset(
        db_session,
        asset_id="asset-chart-3",
        hostname="chart-3",
        business_service="Digital Storefront",
        application=None,
        finding_risks=[],
        environment="test",
        status="Retired",
        compliance_flags="hipaa",
    )
    asset_low = seed_asset(
        db_session,
        asset_id="asset-chart-4",
        hostname="chart-4",
        business_service="Digital Storefront",
        application=None,
        finding_risks=[],
        environment="development",
        status="Confirmed active",
    )
    asset_unscored = seed_asset(
        db_session,
        asset_id="asset-chart-5",
        hostname="chart-5",
        business_service="Digital Storefront",
        application=None,
        finding_risks=[],
        environment="production",
        status="Confirmed active",
    )
    backfill_asset_topology_foreign_keys(db_session)
    asset_critical.crq_asset_context_score = 9.0
    asset_critical.crq_asset_aggregated_finding_risk = 8.9
    asset_high.crq_asset_context_score = 7.0
    asset_high.crq_asset_aggregated_finding_risk = 9.0
    asset_medium.crq_asset_context_score = 4.0
    asset_medium.crq_asset_aggregated_finding_risk = 6.9
    asset_low.crq_asset_context_score = 3.9
    asset_low.crq_asset_aggregated_finding_risk = 4.0
    asset_unscored.crq_asset_context_score = None
    asset_unscored.crq_asset_aggregated_finding_risk = None
    db_session.commit()

    response = client.get(
        "/assets/analytics?business_service=Digital%20Storefront&application=Identity%20Verify&status=Confirmed%20active&environment=production&compliance=PCI"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_assets"] == 1
    assert payload["asset_criticality_distribution"] == {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 1,
        "unscored": 0,
    }
    assert payload["finding_risk_distribution"] == {
        "low": 0,
        "medium": 0,
        "high": 1,
        "critical": 0,
        "unscored": 0,
    }

    all_assets = client.get("/assets/analytics?business_service=Digital%20Storefront")
    assert all_assets.status_code == 200
    all_payload = all_assets.json()
    assert all_payload["total_assets"] == 5
    assert all_payload["asset_criticality_distribution"] == {
        "low": 1,
        "medium": 1,
        "high": 1,
        "critical": 1,
        "unscored": 1,
    }
    assert all_payload["finding_risk_distribution"] == {
        "low": 0,
        "medium": 2,
        "high": 1,
        "critical": 1,
        "unscored": 1,
    }

    direct_only = client.get(
        "/assets/analytics?business_service=Digital%20Storefront&direct_only=true&compliance=regulated"
    )
    assert direct_only.status_code == 200
    direct_only_payload = direct_only.json()
    assert direct_only_payload["total_assets"] == 1
    assert direct_only_payload["asset_criticality_distribution"]["medium"] == 1

def test_topology_routes_return_503_when_normalized_tables_are_not_initialized(
    client,
    db_session,
    monkeypatch,
):
    seed_asset(
        db_session,
        asset_id="asset-30",
        hostname="legacy-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[7.5],
    )
    monkeypatch.setattr(topology_dependencies, "_has_topology_schema", lambda _db: False)

    topology_response = client.get("/topology/business-units")
    assert topology_response.status_code == 503
    assert "topology-expansion.sql" in topology_response.json()["detail"]

    business_service_analytics_response = client.get(
        "/topology/business-units/online-store/business-services/digital-media/analytics"
    )
    assert business_service_analytics_response.status_code == 503
    assert "topology-expansion.sql" in business_service_analytics_response.json()["detail"]

    business_unit_filter_response = client.get("/assets?business_unit=Online%20Store")
    assert business_unit_filter_response.status_code == 503
    assert "business_unit filter" in business_unit_filter_response.json()["detail"]


def test_asset_routes_still_work_without_normalized_topology_tables(client, db_session, monkeypatch):
    seed_asset(
        db_session,
        asset_id="asset-31",
        hostname="legacy-app-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[9.0, 4.0],
    )
    monkeypatch.setattr(topology_dependencies, "_has_topology_schema", lambda _db: False)

    response = client.get("/assets?business_service=Digital%20Media&application=Inventory%20Manager")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["asset_id"] == "asset-31"
    assert payload["items"][0]["business_unit"] is None

    detail = client.get("/assets/asset-31")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["asset_id"] == "asset-31"
    assert detail_payload["business_service"] == "Digital Media"

    findings = client.get("/assets/asset-31/findings")
    assert findings.status_code == 200
    assert findings.json()["total"] == 2

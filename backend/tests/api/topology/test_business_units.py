import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import models
from app.api.topology import dependencies as topology_dependencies
from app.services.crq_business_service_scoring import score_business_unit_rollups
from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.topology import seed_asset, seed_topology


def test_topology_tables_and_unique_constraints_exist(db_engine, db_session):
    inspector = inspect(db_engine)
    assert {"companies", "business_units", "business_services", "applications"}.issubset(
        set(inspector.get_table_names())
    )

    topology = seed_topology(db_session)

    db_session.add(
        models.BusinessService(
            business_unit_id=topology["business_units"]["Online Store"].id,
            name="Digital Media Duplicate Slug",
            slug="digital-media",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(
        models.Application(
            business_service_id=topology["business_services"]["Digital Storefront"].id,
            name="Identity Verify Clone",
            slug="identity-verify",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_seed_counts_match_first_import_pass(db_session):
    seed_topology(db_session)

    assert db_session.query(models.Company).count() == 2
    assert db_session.query(models.BusinessUnit).count() == 2
    assert db_session.query(models.BusinessService).count() == 5
    assert db_session.query(models.Application).count() == 7


def test_backfill_matches_assets_by_exact_name_and_keeps_missing_application_null(db_session):
    topology = seed_topology(db_session)
    digital_media = topology["business_services"]["Digital Media"]
    inventory_manager = topology["applications"]["Inventory Manager"]

    asset_with_application = seed_asset(
        db_session,
        asset_id="asset-1",
        hostname="host-1",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[8.1],
    )
    asset_without_application = seed_asset(
        db_session,
        asset_id="asset-2",
        hostname="host-2",
        business_service="Digital Media",
        application=None,
        finding_risks=[3.5],
    )
    seed_asset(
        db_session,
        asset_id="asset-3",
        hostname="host-3",
        business_service="Unknown Service",
        application="Missing App",
        finding_risks=[],
    )

    updated = backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    assert updated == 2

    refreshed_asset = db_session.get(models.Asset, asset_with_application.asset_id)
    assert refreshed_asset.company_id == topology["companies"]["Virtucon"].id
    assert refreshed_asset.business_unit_id == topology["business_units"]["Online Store"].id
    assert refreshed_asset.business_service_id == digital_media.id
    assert refreshed_asset.application_id == inventory_manager.id

    direct_asset = db_session.get(models.Asset, asset_without_application.asset_id)
    assert direct_asset.business_service_id == digital_media.id
    assert direct_asset.application_id is None

    unmatched_asset = db_session.get(models.Asset, "asset-3")
    assert unmatched_asset.business_service_id is None
    assert unmatched_asset.application_id is None


def test_business_unit_routes_return_seeded_topology_with_rollups(client, db_session):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-1",
        hostname="storefront-app",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[8.1, 5.0],
    )
    seed_asset(
        db_session,
        asset_id="asset-2",
        hostname="storefront-direct",
        business_service="Digital Storefront",
        application=None,
        finding_risks=[3.5],
    )
    seed_asset(
        db_session,
        asset_id="asset-3",
        hostname="digital-media-app",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[7.1],
    )
    seed_asset(
        db_session,
        asset_id="asset-4",
        hostname="shipping-app",
        business_service="Shipping and Tracking",
        application="Cyberdyne.com",
        finding_risks=[4.2],
    )
    seed_asset(
        db_session,
        asset_id="asset-5",
        hostname="manufacturing-app",
        business_service="Manufacturing Shop",
        application="File Sharing",
        finding_risks=[9.1, 2.1],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    response = client.get("/topology/business-units")
    assert response.status_code == 200
    payload = response.json()
    assert [item["business_unit"] for item in payload] == ["Manufacturing", "Online Store"]
    assert client.get("/api/v1/topology/business-units").status_code == 200

    online_store = next(item for item in payload if item["business_unit"] == "Online Store")
    assert online_store["company"]["name"] == "Virtucon"
    assert online_store["description"] == (
        "All online presence and operation including storefront and inventory "
        "systems as well as customer facing interactions."
    )
    assert online_store["metrics"]["total_business_services"] == 3
    assert online_store["metrics"]["total_assets"] == 4
    assert online_store["metrics"]["total_findings"] == 5
    assert online_store["risk_score"] is None
    assert online_store["risk_band"] is None
    assert online_store["priority_score"] is None
    assert online_store["risk_trend"] is None

    manufacturing = next(item for item in payload if item["business_unit"] == "Manufacturing")
    assert manufacturing["company"]["name"] == "Cyberdyne Systems"
    assert manufacturing["description"] == (
        "All development procedures and device manufacturing related services "
        "from warehouses to automated robotics."
    )
    assert manufacturing["metrics"]["total_business_services"] == 2
    assert manufacturing["metrics"]["total_assets"] == 1
    assert manufacturing["metrics"]["total_findings"] == 2
    assert manufacturing["risk_score"] is None
    assert manufacturing["risk_band"] is None
    assert manufacturing["priority_score"] is None
    assert manufacturing["risk_trend"] is None

    online_store_detail = client.get("/topology/business-units/online-store")
    assert online_store_detail.status_code == 200
    online_store_payload = online_store_detail.json()
    assert online_store_payload["business_unit"] == "Online Store"
    assert len(online_store_payload["business_services"]) == 3

    manufacturing_detail = client.get("/topology/business-units/manufacturing")
    assert manufacturing_detail.status_code == 200
    manufacturing_payload = manufacturing_detail.json()
    assert manufacturing_payload["business_unit"] == "Manufacturing"
    assert len(manufacturing_payload["business_services"]) == 2


def test_business_unit_risk_overview_and_findings_routes_scope_and_aggregate_data(
    client, db_session
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-risk-1",
        hostname="asset-risk-1-host",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[9.0, 7.0],
    )
    seed_asset(
        db_session,
        asset_id="asset-risk-2",
        hostname="asset-risk-2-host",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[3.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    overview = client.get("/topology/business-units/online-store/risk-overview")
    assert overview.status_code == 200
    overview_payload = overview.json()
    assert overview_payload["business_unit"] == "Online Store"
    assert overview_payload["slug"] == "online-store"
    assert overview_payload["risk_score"] == 6.33
    assert overview_payload["risk_band"] == "Medium"
    assert overview_payload["severity_counts"] == {
        "Critical": 1,
        "High": 1,
        "Medium": 0,
        "Low": 1,
    }
    assert overview_payload["finding_risk_distribution"] == {
        "low": 1,
        "medium": 0,
        "high": 1,
        "critical": 1,
        "unscored": 0,
    }
    assert len(overview_payload["risk_trend"]) == 6
    assert overview_payload["risk_trend"][-1] == {"period": "Jan 2024", "score": 6.33}

    findings = client.get(
        "/topology/business-units/online-store/findings?page=1&page_size=2&sort_by=risk_score&sort_order=desc"
    )
    assert findings.status_code == 200
    findings_payload = findings.json()
    assert findings_payload["total"] == 3
    assert findings_payload["page"] == 1
    assert findings_payload["page_size"] == 2
    assert [item["id"] for item in findings_payload["items"]] == [
        "asset-risk-1-finding-1",
        "asset-risk-1-finding-2",
    ]
    assert findings_payload["items"][0]["target_names"] == "asset-risk-1-host"

    filtered = client.get("/topology/business-units/online-store/findings?risk_band=High")
    assert filtered.status_code == 200
    filtered_payload = filtered.json()
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["risk_band"] == "High"

    missing = client.get("/topology/business-units/does-not-exist/risk-overview")
    assert missing.status_code == 404


def test_business_unit_routes_expose_persisted_rollup_scores(client, db_session):
    topology = seed_topology(db_session)
    digital_media = topology["business_services"]["Digital Media"]
    shipping = topology["business_services"]["Shipping and Tracking"]
    digital_media.crq_business_service_risk_score = 8.0
    digital_media.crq_business_service_priority_score = 8.6
    shipping.crq_business_service_risk_score = 4.0
    shipping.crq_business_service_priority_score = 5.2
    db_session.commit()
    score_business_unit_rollups(
        db_session,
        business_unit_ids=[topology["business_units"]["Online Store"].id],
    )

    summary = client.get("/topology/business-units")
    assert summary.status_code == 200
    online_store = next(
        item for item in summary.json() if item["business_unit"] == "Online Store"
    )
    assert online_store["risk_score"] == 6.0
    assert online_store["risk_band"] == "Medium"
    assert online_store["priority_score"] == 6.9

    detail = client.get("/topology/business-units/online-store")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["risk_score"] == 6.0
    assert detail_payload["risk_band"] == "Medium"
    assert detail_payload["priority_score"] == 6.9

    overview = client.get("/topology/business-units/online-store/risk-overview")
    assert overview.status_code == 200
    overview_payload = overview.json()
    assert overview_payload["risk_score"] == 6.0
    assert overview_payload["priority_score"] == 6.9


def test_business_unit_risk_routes_return_503_when_topology_schema_is_missing(
    client, db_session, monkeypatch
):
    seed_topology(db_session)
    monkeypatch.setattr(topology_dependencies, "_has_topology_schema", lambda db: False)

    overview = client.get("/topology/business-units/online-store/risk-overview")
    findings = client.get("/topology/business-units/online-store/findings")

    assert overview.status_code == 503
    assert findings.status_code == 503

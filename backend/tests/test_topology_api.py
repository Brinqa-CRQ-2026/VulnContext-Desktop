from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import models
from app.api import topology as topology_api
from app.services.brinqa_detail import BrinqaAuthContext, DetailResult, SourceAttempt
from app.services.topology import backfill_asset_topology_foreign_keys


def seed_topology(db_session):
    virtucon = models.Company(name="Virtucon")
    cyberdyne = models.Company(name="Cyberdyne Systems")
    db_session.add_all([virtucon, cyberdyne])
    db_session.flush()

    online_store = models.BusinessUnit(
        company_id=virtucon.id,
        uid="9876545",
        uuid="9876545",
        name="Online Store",
        slug="online-store",
        description=(
            "All online presence and operation including storefront and inventory "
            "systems as well as customer facing interactions."
        ),
        owner="martin.carley",
        data_integration="ServiceNow",
        connector="Brinqa Connect",
        connector_category="Data Store",
        data_model="ServiceNow Business Unit",
        last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988008974",
        created_by="paden.portillo@brinqa.com",
        updated_by="system",
        source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
        source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
        source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
    )
    manufacturing = models.BusinessUnit(
        company_id=cyberdyne.id,
        uid="4378456",
        uuid="4378456",
        name="Manufacturing",
        slug="manufacturing",
        description=(
            "All development procedures and device manufacturing related services "
            "from warehouses to automated robotics."
        ),
        owner="karen.zombo",
        data_integration="ServiceNow",
        connector="Brinqa Connect",
        connector_category="Data Store",
        data_model="ServiceNow Business Unit",
        last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988008974",
        created_by="paden.portillo@brinqa.com",
        updated_by="system",
        source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
        source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
        source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
    )
    db_session.add_all([online_store, manufacturing])
    db_session.flush()

    business_services = [
        models.BusinessService(
            business_unit_id=online_store.id,
            uid="ds08f97867",
            uuid="ds08f97867",
            name="Digital Media",
            slug="digital-media",
            description="Consumer access of Digital media.",
            criticality_label="3-medium",
            division="Consumer Services",
            manager="beth.anglin",
            data_integration="ServiceNow",
            connector="Brinqa Connect",
            connector_category="Data Store",
            data_model="ServiceNow Business Service",
            last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988005530",
            created_by="paden.portillo@brinqa.com",
            updated_by="system",
            source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
            source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
            source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
            source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        ),
        models.BusinessService(
            business_unit_id=online_store.id,
            uid="df089sd7867",
            uuid="df089sd7867",
            name="Shipping and Tracking",
            slug="shipping-and-tracking",
            description="Maintains the shipping and tracking information on online consumer purchases.",
            criticality_label="2-low",
            division="Consumer Services",
            manager="avinash.yenduri",
            data_integration="ServiceNow",
            connector="Brinqa Connect",
            connector_category="Data Store",
            data_model="ServiceNow Business Service",
            last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988005530",
            created_by="paden.portillo@brinqa.com",
            updated_by="system",
            source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
            source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
            source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
            source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        ),
        models.BusinessService(
            business_unit_id=online_store.id,
            name="Digital Storefront",
            slug="digital-storefront",
            description="This is the experience for our online store.",
        ),
        models.BusinessService(
            business_unit_id=manufacturing.id,
            uid="gf6ds879sdf34",
            uuid="gf6ds879sdf34",
            name="Logistics",
            slug="logistics",
            description="Logistics for device manufacturing",
            criticality_label="3-medium",
            division="Corporate Services",
            manager="carol.coughlin",
            data_integration="ServiceNow",
            connector="Brinqa Connect",
            connector_category="Data Store",
            data_model="ServiceNow Business Service",
            last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988005530",
            created_by="paden.portillo@brinqa.com",
            updated_by="system",
            source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
            source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
            source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
            source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        ),
        models.BusinessService(
            business_unit_id=manufacturing.id,
            uid="afsg67df89sf",
            uuid="afsg67df89sf",
            name="Manufacturing Shop",
            slug="manufacturing-shop",
            description="Infrastructure directly relating to manufacturing shop operation.",
            criticality_label="5-critical",
            division="Corporate Services",
            manager="geoff.smiles",
            data_integration="ServiceNow",
            connector="Brinqa Connect",
            connector_category="Data Store",
            data_model="ServiceNow Business Service",
            last_integration_transaction_id="4d705f41-5ef9-472f-9ada-60724a3ebee2-1739988005530",
            created_by="paden.portillo@brinqa.com",
            updated_by="system",
            source_last_modified_at=datetime(2025, 2, 18, 7, 45, tzinfo=timezone.utc),
            source_last_integrated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
            source_created_at=datetime(2025, 2, 18, 8, 11, tzinfo=timezone.utc),
            source_updated_at=datetime(2025, 2, 19, 10, 0, tzinfo=timezone.utc),
        ),
    ]
    db_session.add_all(business_services)
    db_session.flush()

    service_by_name = {service.name: service for service in business_services}
    applications = [
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Identity Verify",
            slug="identity-verify",
            first_seen_at=datetime(2025, 2, 18, 11, 35, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Virtucon.com",
            slug="virtucon-com",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Science Lab",
            slug="science-lab",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Logistics"].id,
            name="Order Placement",
            slug="order-placement",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Manufacturing Shop"].id,
            name="File Sharing",
            slug="file-sharing",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Shipping and Tracking"].id,
            name="Cyberdyne.com",
            slug="cyberdyne-com",
            first_seen_at=datetime(2025, 2, 18, 11, 35, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Media"].id,
            name="Inventory Manager",
            slug="inventory-manager",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
    ]
    db_session.add_all(applications)
    db_session.commit()

    return {
        "companies": {"Virtucon": virtucon, "Cyberdyne Systems": cyberdyne},
        "business_units": {"Online Store": online_store, "Manufacturing": manufacturing},
        "business_services": service_by_name,
        "applications": {application.name: application for application in applications},
    }


def seed_asset(
    db_session,
    *,
    asset_id: str,
    hostname: str,
    business_service: str,
    application: str | None = None,
    finding_risks: list[float] | None = None,
):
    asset = models.Asset(
        asset_id=asset_id,
        hostname=hostname,
        business_service=business_service,
        application=application,
        environment="test",
        status="Confirmed active",
    )
    db_session.add(asset)
    db_session.flush()

    for idx, risk in enumerate(finding_risks or [], start=1):
        db_session.add(
            models.Finding(
                asset_id=asset_id,
                finding_id=f"{asset_id}-finding-{idx}",
                finding_uid=f"{asset_id}-uid-{idx}",
                finding_name=f"Finding {asset_id}-{idx}",
                status="Confirmed active",
                cve_id=f"CVE-2024-{idx:04d}",
                brinqa_base_risk_score=max(0.0, risk - 1),
                brinqa_risk_score=risk,
                first_found=datetime(2024, 1, 1, tzinfo=timezone.utc),
                last_found=datetime(2024, 1, 15, tzinfo=timezone.utc),
                age_in_days=14.0,
                date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
                last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
            )
        )

    db_session.commit()
    return asset


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

    online_store = next(item for item in payload if item["business_unit"] == "Online Store")
    assert online_store["company"]["name"] == "Virtucon"
    assert online_store["metrics"]["total_business_services"] == 3
    assert online_store["metrics"]["total_assets"] == 4
    assert online_store["metrics"]["total_findings"] == 5

    manufacturing = next(item for item in payload if item["business_unit"] == "Manufacturing")
    assert manufacturing["company"]["name"] == "Cyberdyne Systems"
    assert manufacturing["metrics"]["total_business_services"] == 2
    assert manufacturing["metrics"]["total_assets"] == 1
    assert manufacturing["metrics"]["total_findings"] == 2

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


def test_business_service_and_application_routes_return_direct_assets_and_asset_lists(client, db_session):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-10",
        hostname="identity-verify-node",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[7.1, 6.0],
    )
    seed_asset(
        db_session,
        asset_id="asset-11",
        hostname="direct-storefront-node",
        business_service="Digital Storefront",
        application=None,
        finding_risks=[2.5],
    )
    seed_asset(
        db_session,
        asset_id="asset-12",
        hostname="science-lab-node",
        business_service="Digital Storefront",
        application="Science Lab",
        finding_risks=[],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    service_response = client.get(
        "/topology/business-units/online-store/business-services/digital-storefront"
    )
    assert service_response.status_code == 200
    service_payload = service_response.json()
    assert service_payload["business_service"] == "Digital Storefront"
    assert service_payload["business_unit"] == "Online Store"
    assert service_payload["metrics"]["total_applications"] == 3
    assert service_payload["metrics"]["total_assets"] == 3
    assert service_payload["metrics"]["total_findings"] == 3
    assert {item["application"] for item in service_payload["applications"]} == {
        "Identity Verify",
        "Science Lab",
        "Virtucon.com",
    }
    assert [item["asset_id"] for item in service_payload["direct_assets"]] == ["asset-11"]

    application_response = client.get(
        "/topology/business-units/online-store/business-services/digital-storefront/applications/identity-verify"
    )
    assert application_response.status_code == 200
    application_payload = application_response.json()
    assert application_payload["application"] == "Identity Verify"
    assert application_payload["metrics"]["total_assets"] == 1
    assert application_payload["metrics"]["total_findings"] == 2
    assert [item["asset_id"] for item in application_payload["assets"]] == ["asset-10"]


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


def test_asset_detail_route_is_db_only_and_enrichment_route_uses_request_auth(
    client,
    db_session,
    monkeypatch,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-40",
        hostname="asset-40-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[8.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    def fail_if_called(*args, **kwargs):
        raise AssertionError("asset detail route should not call Brinqa enrichment")

    monkeypatch.setattr(topology_api.asset_detail_service, "get_detail", fail_if_called)

    detail = client.get("/assets/asset-40")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["asset_id"] == "asset-40"
    assert detail_payload["detail_source"] is None

    captured_auth: dict[str, str | None] = {}

    def fake_get_detail(asset, auth=None):
        assert asset.asset_id == "asset-40"
        assert isinstance(auth, BrinqaAuthContext)
        captured_auth["bearer_token"] = auth.bearer_token
        captured_auth["session_cookie"] = auth.session_cookie
        return DetailResult(
            payload={
                "owner": "asset-owner",
                "service_team": "blue-team",
                "location": "Santa Cruz",
                "tracking_method": "Agent",
                "last_scanned": "2025-02-20T10:00:00Z",
                "last_authenticated_scan": "2025-02-21T11:00:00Z",
            },
            fetched_at=datetime(2025, 2, 21, 11, 5, tzinfo=timezone.utc),
            source="qualys+servicenow",
            status="success",
            reason="both_sources_succeeded",
        )

    monkeypatch.setattr(topology_api.asset_detail_service, "get_detail", fake_get_detail)

    enrichment = client.get(
        "/assets/asset-40/enrichment",
        headers={"X-Brinqa-Auth-Token": "token-123"},
    )
    assert enrichment.status_code == 200
    payload = enrichment.json()
    assert captured_auth == {"bearer_token": "token-123", "session_cookie": None}
    assert payload["status"] == "success"
    assert payload["reason"] == "both_sources_succeeded"
    assert payload["owner"] == "asset-owner"
    assert payload["service_team"] == "blue-team"
    assert payload["tracking_method"] == "Agent"
    assert payload["detail_source"] == "qualys+servicenow"


def test_asset_enrichment_route_returns_missing_token_without_token(client, db_session):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-41",
        hostname="asset-41-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[4.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    response = client.get("/assets/asset-41/enrichment")
    assert response.status_code == 200
    payload = response.json()
    assert payload["asset_id"] == "asset-41"
    assert payload["status"] == "missing_token"
    assert payload["reason"] == "missing_auth_token"


@pytest.mark.parametrize(
    ("status", "reason"),
    [
        ("unauthorized_token", "brinqa_unauthorized"),
        ("no_related_source", "no_related_source"),
        ("upstream_error", "qualys_detail_failed"),
    ],
)
def test_asset_enrichment_route_returns_non_success_contract_states(
    client,
    db_session,
    monkeypatch,
    status,
    reason,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-42",
        hostname="asset-42-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[5.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "get_detail",
        lambda asset, auth=None: DetailResult(
            payload=None,
            fetched_at=None,
            source=None,
            status=status,
            reason=reason,
            error=reason,
        ),
    )

    response = client.get(
        "/assets/asset-42/enrichment",
        headers={"X-Brinqa-Auth-Token": "token-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == status
    assert payload["reason"] == reason
    assert payload["detail_source"] is None
    assert payload["detail_fetched_at"] is None


@pytest.mark.parametrize(
    ("asset_id", "payload", "reason", "detail_source"),
    [
        (
            "asset-43",
            {"owner": "sn-owner", "service_team": "blue-team"},
            "qualys_source_missing",
            "servicenow",
        ),
        (
            "asset-44",
            {"dnsname": "host.qualys.local", "tracking_method": "Agent"},
            "servicenow_detail_failed",
            "qualys",
        ),
    ],
)
def test_asset_enrichment_route_returns_partial_success_variants(
    client,
    db_session,
    monkeypatch,
    asset_id,
    payload,
    reason,
    detail_source,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id=asset_id,
        hostname=f"{asset_id}-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[5.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "get_detail",
        lambda asset, auth=None: DetailResult(
            payload=payload,
            fetched_at=datetime(2025, 2, 21, 11, 5, tzinfo=timezone.utc),
            source=detail_source,
            status="partial_success",
            reason=reason,
        ),
    )

    response = client.get(
        f"/assets/{asset_id}/enrichment",
        headers={"X-Brinqa-Auth-Token": "token-123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "partial_success"
    assert data["reason"] == reason
    assert data["detail_source"] == detail_source
    assert data["detail_fetched_at"] == "2025-02-21T11:05:00Z"


def test_asset_enrichment_route_returns_success_when_both_sources_resolve(
    client,
    db_session,
    monkeypatch,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-45",
        hostname="asset-45-host",
        business_service="Digital Media",
        application="Inventory Manager",
        finding_risks=[5.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "get_detail",
        lambda asset, auth=None: DetailResult(
            payload={
                "dnsname": "asset-45.qualys.local",
                "owner": "asset-owner",
                "tracking_method": "Agent",
            },
            fetched_at=datetime(2025, 2, 21, 11, 5, tzinfo=timezone.utc),
            source="qualys+servicenow",
            status="success",
            reason="both_sources_succeeded",
        ),
    )

    response = client.get(
        "/assets/asset-45/enrichment",
        headers={"X-Brinqa-Auth-Token": "token-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["reason"] == "both_sources_succeeded"
    assert payload["detail_source"] == "qualys+servicenow"


def test_asset_detail_service_returns_partial_success_when_only_one_source_succeeds(
    monkeypatch,
):
    asset = models.Asset(asset_id="asset-50", hostname="asset-50-host")
    calls = iter(
        [
            SourceAttempt(
                name="qualys",
                payload={"dnsname": "asset-50.qualys.local"},
                reason=None,
                source_id="qualys-50",
                succeeded=True,
            ),
            SourceAttempt(
                name="servicenow",
                payload=None,
                reason="servicenow_source_missing",
            ),
        ]
    )

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "_fetch_source_attempt",
        lambda *args, **kwargs: next(calls),
    )

    detail = topology_api.asset_detail_service.get_detail(
        asset,
        auth=BrinqaAuthContext(bearer_token="token-123"),
    )

    assert detail.status == "partial_success"
    assert detail.reason == "servicenow_source_missing"
    assert detail.source == "qualys"
    assert detail.payload == {"dnsname": "asset-50.qualys.local"}
    assert detail.fetched_at is not None


def test_asset_detail_service_returns_no_related_source_when_neither_source_resolves(
    monkeypatch,
):
    asset = models.Asset(asset_id="asset-51", hostname="asset-51-host")
    calls = iter(
        [
            SourceAttempt(name="qualys", payload=None, reason="qualys_source_missing"),
            SourceAttempt(name="servicenow", payload=None, reason="servicenow_source_missing"),
        ]
    )

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "_fetch_source_attempt",
        lambda *args, **kwargs: next(calls),
    )

    detail = topology_api.asset_detail_service.get_detail(
        asset,
        auth=BrinqaAuthContext(bearer_token="token-123"),
    )

    assert detail.status == "no_related_source"
    assert detail.reason == "no_related_source"
    assert detail.payload is None


def test_asset_detail_service_returns_unauthorized_token_when_brinqa_rejects_auth(
    monkeypatch,
):
    asset = models.Asset(asset_id="asset-52", hostname="asset-52-host")
    calls = iter(
        [
            SourceAttempt(
                name="qualys",
                payload=None,
                reason="brinqa_unauthorized",
                unauthorized=True,
            ),
            SourceAttempt(name="servicenow", payload=None, reason="servicenow_source_missing"),
        ]
    )

    monkeypatch.setattr(
        topology_api.asset_detail_service,
        "_fetch_source_attempt",
        lambda *args, **kwargs: next(calls),
    )

    detail = topology_api.asset_detail_service.get_detail(
        asset,
        auth=BrinqaAuthContext(bearer_token="token-123"),
    )

    assert detail.status == "unauthorized_token"
    assert detail.reason == "brinqa_unauthorized"
    assert detail.payload is None


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
    monkeypatch.setattr(topology_api, "_has_topology_schema", lambda _db: False)

    topology_response = client.get("/topology/business-units")
    assert topology_response.status_code == 503
    assert "topology-expansion.sql" in topology_response.json()["detail"]

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
    monkeypatch.setattr(topology_api, "_has_topology_schema", lambda _db: False)

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

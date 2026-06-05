from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.topology import seed_asset, seed_topology


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

from app import models
from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.topology import seed_asset, seed_topology


def test_business_service_analytics_route_returns_totals_distributions_and_top_five_asset_types(
    client, db_session
):
    seed_topology(db_session)
    business_service = (
        db_session.query(models.BusinessService)
        .filter(models.BusinessService.slug == "digital-media")
        .one()
    )
    business_service.business_criticality_score = 3
    business_service.crq_business_service_risk_score = 7.2
    business_service.crq_business_service_priority_score = 6.84
    seeded_assets = [
        seed_asset(
            db_session,
            asset_id="asset-bs-1",
            hostname="server-1",
            business_service="Digital Media",
            application="Inventory Manager",
            finding_risks=[9.1],
            device_type="Server",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-2",
            hostname="server-2",
            business_service="Digital Media",
            finding_risks=[8.0],
            device_type="Server",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-3",
            hostname="server-3",
            business_service="Digital Media",
            finding_risks=[7.0],
            device_type="Server",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-4",
            hostname="firewall-1",
            business_service="Digital Media",
            finding_risks=[6.0],
            device_type="Firewall",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-5",
            hostname="firewall-2",
            business_service="Digital Media",
            finding_risks=[5.0],
            device_type="Firewall",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-6",
            hostname="workstation-1",
            business_service="Digital Media",
            finding_risks=[4.0],
            device_type="Workstation",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-7",
            hostname="proxy-1",
            business_service="Digital Media",
            finding_risks=[3.0],
            device_type="Proxy",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-8",
            hostname="router-1",
            business_service="Digital Media",
            finding_risks=[2.0],
            device_type="Router",
        ),
        seed_asset(
            db_session,
            asset_id="asset-bs-9",
            hostname="switch-1",
            business_service="Digital Media",
            finding_risks=[1.0],
            category="Network",
        ),
    ]
    backfill_asset_topology_foreign_keys(db_session)
    context_scores = [9.0, 9.1, 7.2, 4.5, 3.1, 5.0, None, 7.6, 2.0]
    for asset, score in zip(seeded_assets, context_scores, strict=True):
        asset.crq_asset_context_score = score
    db_session.commit()

    response = client.get(
        "/topology/business-units/online-store/business-services/digital-media/analytics"
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["service_risk_score"] == 7.2
    assert payload["service_risk_label"] == "High"
    assert payload["service_priority_score"] == 6.84
    assert payload["business_criticality_score"] == 3
    assert payload["business_criticality_max"] == 5
    assert payload["business_criticality_label"] == "Medium"
    assert payload["totals"] == {
        "applications": 1,
        "assets": 9,
        "findings": 9,
    }
    assert payload["asset_criticality_distribution"] == {
        "low": 2,
        "medium": 2,
        "high": 2,
        "critical": 2,
        "unscored": 1,
    }
    assert payload["asset_type_distribution"] == [
        {"label": "Server", "count": 3},
        {"label": "Firewall", "count": 2},
        {"label": "Network", "count": 1},
        {"label": "Proxy", "count": 1},
        {"label": "Router", "count": 1},
    ]

    missing = client.get(
        "/topology/business-units/online-store/business-services/does-not-exist/analytics"
    )
    assert missing.status_code == 404

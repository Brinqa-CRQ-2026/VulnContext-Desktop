from app import models
from app.api import findings as findings_api
from app.api.topology import fair_loss as topology_fair_api
from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.findings import seed_asset_and_finding
from helpers.topology import seed_asset, seed_topology


def fair_response(**overrides):
    payload = {
        "control_score": 0.7,
        "vulnerability": 0.2,
        "tef_mean": 4.0,
        "lef_mean": 0.8,
        "loss_mean": 12000.0,
        "loss_p50": 8000.0,
        "loss_p90": 25000.0,
        "loss_p95": 35000.0,
        "loss_p99": 70000.0,
        "worst_loss": 95000.0,
        "lm_mean": 15000.0,
        "primary_mean": 10000.0,
        "secondary_mean": 5000.0,
        "histogram": [{"loss": 1000.0, "probability": 1.0}],
    }
    payload.update(overrides)
    return payload


def test_finding_fair_loss_endpoint_maps_finding_and_payload_to_prediction_service(
    client,
    db_session,
    monkeypatch,
):
    _, finding = seed_asset_and_finding(db_session, idx=7, risk=8.4)
    captured = {}

    def fake_simulate(found_finding, inputs):
        captured["finding"] = found_finding
        captured["inputs"] = inputs
        return fair_response(primary_mean=inputs.primary_loss_mean, secondary_mean=inputs.secondary_loss_mean)

    monkeypatch.setattr(findings_api.fair_loss_prediction_service, "simulate", fake_simulate)

    response = client.post(
        f"/findings/{finding.finding_id}/fair-loss",
        json={
            "control_context": {"prevent": {"patch_maturity": 4}},
            "primary_loss_mean": 25000,
            "secondary_loss_mean": 7500,
            "iterations": 1000,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["primary_mean"] == 25000.0
    assert payload["secondary_mean"] == 7500.0
    assert payload["histogram"] == [{"loss": 1000.0, "probability": 1.0}]
    assert captured["finding"].finding_id == finding.finding_id
    assert captured["finding"].asset.asset_id == "asset-7"
    assert captured["inputs"].control_context == {"prevent": {"patch_maturity": 4}}
    assert captured["inputs"].iterations == 1000


def test_finding_fair_loss_endpoint_returns_not_found_for_unknown_finding(client):
    response = client.post("/findings/missing/fair-loss", json={"iterations": 1000})

    assert response.status_code == 404
    assert response.json()["detail"] == "Finding not found."


def test_asset_fair_loss_endpoint_maps_asset_id_and_payload_to_scope_service(
    client,
    db_session,
    monkeypatch,
):
    seed_asset(db_session, asset_id="asset-fair", hostname="asset-fair", business_service="Digital Media")
    captured = {}

    def fake_simulate_asset(db, asset_id, inputs):
        captured["asset_id"] = asset_id
        captured["inputs"] = inputs
        return fair_response(primary_mean=inputs.primary_loss_mean, secondary_mean=inputs.secondary_loss_mean)

    monkeypatch.setattr(
        topology_fair_api.fair_scope_loss_prediction_service,
        "simulate_asset",
        fake_simulate_asset,
    )

    response = client.post(
        "/assets/asset-fair/fair-loss",
        json={"primary_loss_mean": 30000, "secondary_loss_mean": 9000, "iterations": 1000},
    )

    assert response.status_code == 200
    assert response.json()["primary_mean"] == 30000.0
    assert captured["asset_id"] == "asset-fair"
    assert captured["inputs"].secondary_loss_mean == 9000


def test_application_fair_loss_endpoint_maps_slugs_to_scope_service(
    client,
    db_session,
    monkeypatch,
):
    seed_topology(db_session)
    captured = {}

    def fake_simulate_application(
        db,
        business_unit_slug,
        business_service_slug,
        application_slug,
        inputs,
    ):
        captured["slugs"] = (business_unit_slug, business_service_slug, application_slug)
        captured["inputs"] = inputs
        return fair_response()

    monkeypatch.setattr(
        topology_fair_api.fair_scope_loss_prediction_service,
        "simulate_application",
        fake_simulate_application,
    )

    response = client.post(
        "/topology/business-units/online-store/business-services/digital-storefront/applications/identity-verify/fair-loss",
        json={"iterations": 1000},
    )

    assert response.status_code == 200
    assert captured["slugs"] == ("online-store", "digital-storefront", "identity-verify")
    assert captured["inputs"].iterations == 1000


def test_business_service_fair_loss_endpoint_maps_slugs_to_scope_service(
    client,
    db_session,
    monkeypatch,
):
    seed_topology(db_session)
    captured = {}

    def fake_simulate_business_service(db, business_unit_slug, business_service_slug, inputs):
        captured["slugs"] = (business_unit_slug, business_service_slug)
        captured["inputs"] = inputs
        return fair_response()

    monkeypatch.setattr(
        topology_fair_api.fair_scope_loss_prediction_service,
        "simulate_business_service",
        fake_simulate_business_service,
    )

    response = client.post(
        "/topology/business-units/online-store/business-services/digital-storefront/fair-loss",
        json={"control_context": {"detect_logging_maturity": 4}, "iterations": 1000},
    )

    assert response.status_code == 200
    assert captured["slugs"] == ("online-store", "digital-storefront")
    assert captured["inputs"].control_context == {"detect_logging_maturity": 4}


def test_scope_fair_service_returns_empty_prediction_for_missing_application(db_session):
    inputs = topology_fair_api.LossPredictionInputs(
        control_context={},
        primary_loss_mean=22000,
        secondary_loss_mean=8000,
        iterations=1000,
    )

    result = topology_fair_api.FairScopeLossPredictionService().simulate_application(
        db_session,
        "online-store",
        "digital-storefront",
        "missing-app",
        inputs,
    )

    assert result["loss_mean"] == 0.0
    assert result["primary_mean"] == 22000.0
    assert result["secondary_mean"] == 8000.0
    assert result["histogram"] == [{"loss": 0.0, "probability": 1.0}]


def test_scope_fair_service_aggregates_ranked_asset_findings(db_session):
    topology = seed_topology(db_session)
    asset = seed_asset(
        db_session,
        asset_id="asset-ranked",
        hostname="asset-ranked",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[4.0, 9.0],
    )
    asset.business_unit_id = topology["business_units"]["Online Store"].id
    asset.business_service_id = topology["business_services"]["Digital Storefront"].id
    asset.application_id = topology["applications"]["Identity Verify"].id
    findings = (
        db_session.query(models.Finding)
        .filter(models.Finding.asset_id == "asset-ranked")
        .order_by(models.Finding.finding_id)
        .all()
    )
    findings[0].crq_finding_score = 4.0
    findings[1].crq_finding_score = 9.0
    findings[1].crq_finding_is_kev = True
    db_session.commit()

    service = topology_fair_api.FairScopeLossPredictionService()
    seen = []

    def fake_distribution(finding, inputs):
        seen.append(finding.finding_id)
        return {
            "control_score": 0.5,
            "vulnerability": 0.25,
            "tef_mean": finding.crq_finding_score,
            "lef_mean": 1.0,
            "loss_mean": finding.crq_finding_score * 1000,
            "loss_p50": 0.0,
            "loss_p90": 0.0,
            "loss_p95": 0.0,
            "loss_p99": 0.0,
            "worst_loss": 0.0,
            "lm_mean": finding.crq_finding_score * 1000,
            "primary_mean": inputs.primary_loss_mean,
            "secondary_mean": inputs.secondary_loss_mean,
            "histogram": [],
            "risk_distribution": [],
        }

    service.finding_service.simulate_with_distribution = fake_distribution
    inputs = topology_fair_api.LossPredictionInputs(
        control_context={},
        primary_loss_mean=10000,
        secondary_loss_mean=5000,
        iterations=1000,
    )

    result = service.simulate_asset(db_session, "asset-ranked", inputs)

    assert seen == ["asset-ranked-finding-2", "asset-ranked-finding-1"]
    assert result["control_score"] == 0.5
    assert result["vulnerability"] == 0.25
    assert result["tef_mean"] > 9.0
    assert result["lef_mean"] > 0.0
    assert result["loss_mean"] >= 0.0
    assert result["histogram"]


def test_backfilled_application_scope_fair_prediction_uses_normalized_asset_fk(
    db_session,
):
    seed_topology(db_session)
    seed_asset(
        db_session,
        asset_id="asset-app-scope",
        hostname="asset-app-scope",
        business_service="Digital Storefront",
        application="Identity Verify",
        finding_risks=[8.0],
    )
    backfill_asset_topology_foreign_keys(db_session)
    db_session.commit()
    service = topology_fair_api.FairScopeLossPredictionService()
    seen = []

    def fake_distribution(finding, inputs):
        seen.append(finding.asset_id)
        return fair_response(
            loss_mean=10000.0,
            tef_mean=3.0,
            vulnerability=0.2,
            lm_mean=12000.0,
            risk_distribution=[],
        )

    service.finding_service.simulate_with_distribution = fake_distribution
    inputs = topology_fair_api.LossPredictionInputs(
        control_context={},
        primary_loss_mean=10000,
        secondary_loss_mean=5000,
        iterations=1000,
    )

    result = service.simulate_application(
        db_session,
        "online-store",
        "digital-storefront",
        "identity-verify",
        inputs,
    )

    assert seen == ["asset-app-scope"]
    assert result["loss_mean"] >= 0.0

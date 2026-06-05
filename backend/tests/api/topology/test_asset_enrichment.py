from datetime import datetime, timezone

import pytest

from app import models
from app.api import topology as topology_api
from app.services.brinqa_detail import BrinqaAuthContext, DetailResult, SourceAttempt
from app.services.topology import backfill_asset_topology_foreign_keys
from helpers.topology import seed_asset, seed_topology


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

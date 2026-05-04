from datetime import datetime, timezone

from app import models
from app.api import controls as controls_api
from app.api import findings as findings_api
from app.services.brinqa_detail import DetailResult


def seed_asset_and_finding(
    db_session,
    *,
    idx: int,
    risk: float,
    status: str = "Confirmed active",
    crq_finding_score: float | None = None,
    crq_finding_risk_band: str | None = None,
    crq_finding_is_kev: bool | None = None,
):
    asset = models.Asset(
        asset_id=f"asset-{idx}",
        hostname=f"host-{idx}",
        environment="test",
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
        crq_finding_score=crq_finding_score,
        crq_finding_risk_band=crq_finding_risk_band,
        crq_finding_score_version="v4" if crq_finding_score is not None else None,
        crq_finding_scored_at=datetime(2024, 1, 21, tzinfo=timezone.utc) if crq_finding_score is not None else None,
        crq_finding_cvss_score=8.8 if crq_finding_score is not None else None,
        crq_finding_epss_score=0.42 if crq_finding_score is not None else None,
        crq_finding_epss_percentile=0.97 if crq_finding_score is not None else None,
        crq_finding_epss_multiplier=0.35 if crq_finding_score is not None else None,
        crq_finding_is_kev=crq_finding_is_kev,
        crq_finding_kev_bonus=0.9 if crq_finding_is_kev else 0.0 if crq_finding_score is not None else None,
        crq_finding_age_days=14.0 if crq_finding_score is not None else None,
        crq_finding_age_bonus=0.0 if crq_finding_score is not None else None,
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


def test_control_questionnaire_score_endpoint_accepts_nested_answers(client):
    response = client.post(
        "/controls/questionnaire-score",
        json={
            "answers": {
                "prevent": {
                    "patch_maturity": 4,
                    "mfa_maturity": 4,
                    "segmentation_maturity": 3,
                    "hardening_maturity": 4,
                },
                "detect": {
                    "logging_maturity": 2,
                    "siem_maturity": 3,
                    "speed_maturity": 1,
                },
                "respond": {
                    "plan_maturity": 4,
                    "speed_maturity": 3,
                    "automation_maturity": 4,
                },
                "contain": {
                    "edr_maturity": 1,
                    "privilege_maturity": 3,
                    "data_maturity": 4,
                },
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["confidence"] == 1.0
    assert payload["prevent_score"] == (4 + 4 + 3 + 4) / 20
    assert payload["detect_score"] == (2 + 3 + 1) / 15
    assert payload["respond_score"] == (4 + 3 + 4) / 15
    assert payload["contain_score"] == (1 + 3 + 4) / 15
    assert payload["control_score"] == (
        0.35 * payload["prevent_score"]
        + 0.25 * payload["detect_score"]
        + 0.25 * payload["respond_score"]
        + 0.15 * payload["contain_score"]
    )
    assert payload["flat_context"]["prevent_patch_maturity"] == 4
    assert payload["answers"]["detect"]["speed_maturity"] == 1


def test_control_assessment_save_and_retrieve_use_supabase_table(client, monkeypatch):
    class FakeResponse:
        def __init__(self, data):
            self.data = data

    class FakeQuery:
        def __init__(self, rows):
            self.rows = rows
            self.action = "select"
            self.payload = None
            self.filters = {}

        def select(self, *_args):
            self.action = "select"
            return self

        def insert(self, payload):
            self.action = "insert"
            self.payload = payload
            return self

        def update(self, payload):
            self.action = "update"
            self.payload = payload
            return self

        def eq(self, key, value):
            self.filters[key] = value
            return self

        def order(self, *_args, **_kwargs):
            return self

        def limit(self, *_args):
            return self

        def execute(self):
            if self.action == "insert":
                row = {
                    "id": "assessment-1",
                    "created_at": "2026-05-03T00:00:00Z",
                    **self.payload,
                }
                self.rows.append(row)
                return FakeResponse([row])

            if self.action == "update":
                for row in self.rows:
                    if all(row.get(key) == value for key, value in self.filters.items()):
                        row.update(self.payload)
                        return FakeResponse([row])
                return FakeResponse([])

            return FakeResponse(self.rows[:1])

    class FakeSupabase:
        def __init__(self):
            self.rows = []
            self.table_names = []

        def table(self, name):
            self.table_names.append(name)
            return FakeQuery(self.rows)

    fake_supabase = FakeSupabase()
    monkeypatch.setattr(controls_api, "get_supabase_client", lambda: fake_supabase)

    response = client.put(
        "/controls/current",
        json={
            "answers": {
                "prevent": {
                    "patch_maturity": 4,
                    "mfa_maturity": 4,
                    "segmentation_maturity": 3,
                    "hardening_maturity": 4,
                },
                "detect": {
                    "logging_maturity": 2,
                    "siem_maturity": 3,
                    "speed_maturity": 1,
                },
                "respond": {
                    "plan_maturity": 4,
                    "speed_maturity": 3,
                    "automation_maturity": 4,
                },
                "contain": {
                    "edr_maturity": 1,
                    "privilege_maturity": 3,
                    "data_maturity": 4,
                },
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["answers"]["detect"]["speed_maturity"] == 1
    assert "control_assessments" in fake_supabase.table_names

    current = client.get("/controls/current")
    assert current.status_code == 200
    assert current.json()["id"] == "assessment-1"


def test_fair_loss_prediction_uses_questionnaire_context(client, db_session):
    asset, finding = seed_asset_and_finding(
        db_session,
        idx=8,
        risk=8.1,
        crq_finding_score=8.8,
        crq_finding_risk_band="High",
        crq_finding_is_kev=True,
    )
    asset.crq_asset_exposure_score = 0.8
    asset.crq_asset_type_score = 0.7
    asset.crq_asset_data_sensitivity_score = 0.9
    asset.crq_asset_environment_score = 0.8
    asset.crq_asset_context_score = 8.0
    asset.crq_asset_aggregated_finding_risk = 7.5
    db_session.commit()

    response = client.post(
        f"/findings/{finding.finding_id}/fair-loss",
        json={
            "control_context": {
                "prevent": {
                    "patch_maturity": 4,
                    "mfa_maturity": 5,
                    "segmentation_maturity": 3,
                    "hardening_maturity": 4,
                },
                "detect": {
                    "logging_maturity": 3,
                    "siem_maturity": 4,
                    "speed_maturity": 3,
                },
                "respond": {
                    "plan_maturity": 4,
                    "speed_maturity": 3,
                    "automation_maturity": 2,
                },
                "contain": {
                    "edr_maturity": 4,
                    "privilege_maturity": 3,
                    "data_maturity": 5,
                },
            },
            "primary_loss_mean": 50000,
            "secondary_loss_mean": 15000,
            "iterations": 1000,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert 0 <= payload["control_score"] <= 1
    assert payload["tef_mean"] >= 0
    assert payload["lef_mean"] >= 0
    assert payload["loss_p50"] >= 0
    assert payload["loss_p90"] >= payload["loss_p50"]
    assert payload["loss_p95"] >= payload["loss_p90"]
    assert payload["worst_loss"] >= payload["loss_p95"]
    assert len(payload["histogram"]) > 0


def test_findings_enrichment_route_returns_explicit_narrative_payload(
    client,
    db_session,
    monkeypatch,
):
    _, finding = seed_asset_and_finding(
        db_session,
        idx=6,
        risk=7.5,
        crq_finding_score=8.0,
        crq_finding_risk_band="High",
    )

    monkeypatch.setattr(
        findings_api.finding_detail_service,
        "get_detail",
        lambda db, finding: DetailResult(
            payload={
                "summary": "Narrative summary",
                "description": "Narrative description",
                "record_link": "https://example.com/findings/2006",
                "source_status": "Open",
                "severity": "High",
                "due_date": "2026-05-01T00:00:00Z",
                "attack_pattern_names": "Initial Access",
                "attack_technique_names": "T1190",
                "attack_tactic_names": "Execution",
                "risk_owner_name": "owner-1",
                "remediation_owner_name": "owner-2",
                "remediation_status": "Investigating",
            },
            fetched_at=datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc),
            source="brinqa",
        ),
    )

    response = client.get(f"/findings/{finding.finding_id}/enrichment")
    assert response.status_code == 200
    payload = response.json()
    assert payload["finding_id"] == "2006"
    assert payload["summary"] == "Narrative summary"
    assert payload["description"] == "Narrative description"
    assert payload["detail_source"] == "brinqa"
    assert payload["detail_fetched_at"] == "2026-04-26T12:00:00Z"


def test_sources_summary_is_read_only(client, db_session):
    seed_asset_and_finding(db_session, idx=7, risk=6.0)

    response = client.get("/sources")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source"] == "Brinqa"
    assert payload[0]["total_findings"] == 1

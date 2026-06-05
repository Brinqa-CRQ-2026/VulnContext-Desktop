from app.api import controls as controls_api
from app.services.security_score import DEFAULT_CONTROL_ANSWERS


class FakeSupabaseResponse:
    def __init__(self, data):
        self.data = data


class FakeSupabaseTable:
    def __init__(self, responses=None, *, error=None):
        self.responses = list(responses or [])
        self.error = error
        self.inserted = None
        self.updated = None
        self.selected = None

    def select(self, columns):
        self.selected = columns
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def update(self, data):
        self.updated = data
        return self

    def insert(self, data):
        self.inserted = data
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self.error:
            raise self.error
        return self.responses.pop(0)


class FakeSupabase:
    def __init__(self, table):
        self._table = table

    def table(self, table_name):
        assert table_name == controls_api.CONTROL_ASSESSMENTS_TABLE
        return self._table


def test_security_score_endpoint_normalizes_answers_and_returns_flat_context(client):
    response = client.post(
        "/controls/security-score",
        json={
            "answers": {
                "prevent": {"patch_maturity": 5, "mfa_maturity": "4"},
                "detect_logging_maturity": 2,
                "respond": {"automation_maturity": 9},
                "contain": "invalid",
            }
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert 0.0 <= payload["control_score"] <= 1.0
    assert payload["confidence"] == 4 / 13
    assert payload["answers"]["prevent"]["patch_maturity"] == 5
    assert payload["answers"]["prevent"]["mfa_maturity"] == 4
    assert payload["answers"]["detect"]["logging_maturity"] == 2
    assert payload["answers"]["respond"]["automation_maturity"] == 5
    assert payload["answers"]["contain"] == DEFAULT_CONTROL_ANSWERS["contain"]
    assert payload["flat_context"]["prevent_patch_maturity"] == 5
    assert payload["flat_context"]["detect_logging_maturity"] == 2


def test_controls_current_returns_default_assessment_when_supabase_has_no_rows(
    client,
    monkeypatch,
):
    table = FakeSupabaseTable([FakeSupabaseResponse([])])
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.get("/controls/current")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] is None
    assert payload["created_at"] is None
    assert payload["updated_at"] is None
    assert payload["answers"] == DEFAULT_CONTROL_ANSWERS
    assert 0.0 <= payload["control_score"] <= 1.0


def test_controls_current_save_inserts_security_score_in_supabase(client, monkeypatch):
    table = FakeSupabaseTable(
        [
            FakeSupabaseResponse([]),
            FakeSupabaseResponse(
                [
                    {
                        "id": "assessment-1",
                        "created_at": "2026-04-01T00:00:00+00:00",
                        "updated_at": "2026-04-02T00:00:00+00:00",
                        "control_score": 0.75,
                        "confidence": 1.0,
                        "prevent_score": 0.8,
                        "detect_score": 0.7,
                        "respond_score": 0.6,
                        "contain_score": 0.9,
                        "answers": DEFAULT_CONTROL_ANSWERS,
                    }
                ]
            ),
        ]
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.put("/controls/current", json={"answers": DEFAULT_CONTROL_ANSWERS})

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "assessment-1"
    assert payload["control_score"] == 0.75
    assert table.inserted is not None
    assert table.inserted["answers"] == DEFAULT_CONTROL_ANSWERS
    assert "updated_at" in table.inserted


def test_controls_current_save_updates_existing_security_score(client, monkeypatch):
    table = FakeSupabaseTable(
        [
            FakeSupabaseResponse([{"id": "assessment-existing"}]),
            FakeSupabaseResponse(
                [
                    {
                        "id": "assessment-existing",
                        "created_at": "2026-04-01T00:00:00+00:00",
                        "updated_at": "2026-04-03T00:00:00+00:00",
                        "control_score": 0.8,
                        "confidence": 1.0,
                        "prevent_score": 0.8,
                        "detect_score": 0.7,
                        "respond_score": 0.6,
                        "contain_score": 0.9,
                        "answers": DEFAULT_CONTROL_ANSWERS,
                    }
                ]
            ),
        ]
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.put("/controls/current", json={"answers": DEFAULT_CONTROL_ANSWERS})

    assert response.status_code == 200
    assert response.json()["id"] == "assessment-existing"
    assert table.updated is not None
    assert table.inserted is None


def test_controls_legacy_save_delegates_to_current_save(client, monkeypatch):
    table = FakeSupabaseTable(
        [
            FakeSupabaseResponse([]),
            FakeSupabaseResponse(
                [
                    {
                        "id": "legacy-assessment",
                        "created_at": "2026-04-01T00:00:00+00:00",
                        "updated_at": "2026-04-02T00:00:00+00:00",
                        "control_score": 0.75,
                        "confidence": 1.0,
                        "prevent_score": 0.8,
                        "detect_score": 0.7,
                        "respond_score": 0.6,
                        "contain_score": 0.9,
                        "answers": DEFAULT_CONTROL_ANSWERS,
                    }
                ]
            ),
        ]
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.post("/controls/save", json={"answers": DEFAULT_CONTROL_ANSWERS})

    assert response.status_code == 200
    assert response.json()["id"] == "legacy-assessment"
    assert table.inserted is not None


def test_controls_saved_latest_returns_latest_or_none(client, monkeypatch):
    table = FakeSupabaseTable(
        [
            FakeSupabaseResponse(
                [
                    {
                        "id": "latest-assessment",
                        "created_at": "2026-04-01T00:00:00+00:00",
                        "updated_at": "2026-04-02T00:00:00+00:00",
                        "control_score": 0.75,
                        "confidence": 1.0,
                        "prevent_score": 0.8,
                        "detect_score": 0.7,
                        "respond_score": 0.6,
                        "contain_score": 0.9,
                        "answers": DEFAULT_CONTROL_ANSWERS,
                    }
                ]
            ),
            FakeSupabaseResponse([]),
        ]
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    latest = client.get("/controls/saved/latest")
    empty = client.get("/controls/saved/latest")

    assert latest.status_code == 200
    assert latest.json()["id"] == "latest-assessment"
    assert empty.status_code == 200
    assert empty.json() is None


def test_controls_current_requires_supabase_environment(client, monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)

    response = client.get("/controls/current")

    assert response.status_code == 503
    assert "Missing SUPABASE_URL" in response.json()["detail"]


def test_controls_current_maps_supabase_read_failure_to_bad_gateway(client, monkeypatch):
    table = FakeSupabaseTable(error=RuntimeError("supabase unavailable"))
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.get("/controls/current")

    assert response.status_code == 502
    assert response.json()["detail"] == "Failed to retrieve security score from Supabase."


def test_controls_current_maps_supabase_save_failure_to_bad_gateway(client, monkeypatch):
    table = FakeSupabaseTable(error=RuntimeError("supabase unavailable"))
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.put("/controls/current", json={"answers": DEFAULT_CONTROL_ANSWERS})

    assert response.status_code == 502
    assert response.json()["detail"] == "Failed to save security score to Supabase."


def test_controls_saved_latest_maps_supabase_failure_to_bad_gateway(client, monkeypatch):
    table = FakeSupabaseTable(error=RuntimeError("supabase unavailable"))
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setattr(controls_api, "create_client", lambda *_args: FakeSupabase(table))

    response = client.get("/controls/saved/latest")

    assert response.status_code == 502
    assert response.json()["detail"] == "Failed to retrieve latest security score from Supabase."


def test_control_assessment_coercion_rejects_missing_supabase_rows():
    try:
        controls_api._coerce_control_assessment_response(None)
    except controls_api.HTTPException as exc:
        assert exc.status_code == 502
        assert exc.detail == "Supabase returned no security score data."
    else:
        raise AssertionError("Expected missing Supabase rows to raise HTTPException")

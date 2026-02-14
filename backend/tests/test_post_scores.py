from app import models


def test_create_scored_finding_success(client):
    """Validates POST /scores creates and returns a scored finding row."""
    payload = {
        "finding_id": "NEW-1",
        "asset_id": "ASSET-1",
        "cvss_score": 9.1,
        "epss_score": 0.72,
        "internet_exposed": True,
        "asset_criticality": 4,
    }

    response = client.post("/scores/", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert {"id", "finding_id", "asset_id", "risk_score", "risk_band"}.issubset(
        data.keys()
    )
    assert data["finding_id"] == payload["finding_id"]
    assert data["asset_id"] == payload["asset_id"]
    assert isinstance(data["risk_score"], float)
    assert data["risk_band"] in {"Low", "Medium", "High", "Critical"}


def test_create_scored_finding_missing_required_field_returns_422(client):
    """Validates schema validation rejects incomplete request payloads."""
    payload = {
        "finding_id": "NEW-2",
        "asset_id": "ASSET-2",
        "cvss_score": 7.2,
        # missing epss_score
        "internet_exposed": False,
        "asset_criticality": 2,
    }

    response = client.post("/scores/", json=payload)

    assert response.status_code == 422


def test_create_scored_finding_persists_to_database(client, db_session):
    """Validates POST /scores persists a row to the integration test DB."""
    payload = {
        "finding_id": "NEW-3",
        "asset_id": "ASSET-3",
        "cvss_score": 5.5,
        "epss_score": 0.2,
        "internet_exposed": False,
        "asset_criticality": 1,
    }

    response = client.post("/scores/", json=payload)
    assert response.status_code == 200
    created_id = response.json()["id"]

    row = db_session.query(models.ScoredFinding).filter_by(id=created_id).first()
    assert row is not None
    assert row.finding_id == payload["finding_id"]
    assert row.asset_id == payload["asset_id"]

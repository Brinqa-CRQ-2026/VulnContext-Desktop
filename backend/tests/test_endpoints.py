from app import models


def _seed_finding(db_session, *, idx: int, risk_score: float, risk_band: str):
    # Minimal row constructor used by endpoint tests to seed the test DB quickly.
    finding = models.ScoredFinding(
        finding_id=f"F-{idx}",
        asset_id=f"A-{idx}",
        asset_criticality=3,
        cvss_score=7.0,
        epss_score=0.4,
        internet_exposed=bool(idx % 2),
        auth_required=False,
        risk_score=risk_score,
        risk_band=risk_band,
    )
    db_session.add(finding)
    return finding


def test_get_scores_summary_empty(client):
    """Validates empty database summary shape and zero counts."""
    response = client.get("/scores/summary")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"total_findings", "risk_bands"}
    assert payload["total_findings"] == 0
    assert payload["risk_bands"] == {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
    }


def test_get_scores_summary_counts_by_band(client, db_session):
    """Validates /scores/summary returns correct per-band aggregation."""
    _seed_finding(db_session, idx=1, risk_score=93.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=89.0, risk_band="Critical")
    _seed_finding(db_session, idx=3, risk_score=71.0, risk_band="High")
    _seed_finding(db_session, idx=4, risk_score=55.0, risk_band="Medium")
    _seed_finding(db_session, idx=5, risk_score=21.0, risk_band="Low")
    db_session.commit()

    response = client.get("/scores/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_findings"] == 5
    assert payload["risk_bands"]["Critical"] == 2
    assert payload["risk_bands"]["High"] == 1
    assert payload["risk_bands"]["Medium"] == 1
    assert payload["risk_bands"]["Low"] == 1


def test_get_scores_top10_sorted_desc_and_limited(client, db_session):
    """Validates /scores/top10 limits to 10 rows and sorts by risk descending."""
    for idx in range(12):
        _seed_finding(
            db_session,
            idx=idx,
            risk_score=float(idx),
            risk_band="Low",
        )
    db_session.commit()

    response = client.get("/scores/top10")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 10

    risk_scores = [item["risk_score"] for item in payload]
    assert risk_scores == sorted(risk_scores, reverse=True)

    first_item = payload[0]
    assert {"id", "finding_id", "asset_id", "risk_score", "risk_band"}.issubset(
        first_item.keys()
    )


def test_get_scores_top10_with_fewer_than_ten_rows(client, db_session):
    """Validates /scores/top10 returns all rows when total is under limit."""
    for idx in range(3):
        _seed_finding(
            db_session,
            idx=idx,
            risk_score=50.0 + idx,
            risk_band="Medium",
        )
    db_session.commit()

    response = client.get("/scores/top10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3


def test_get_scores_top10_handles_tied_scores(client, db_session):
    """Validates /scores/top10 remains sorted when many scores are equal."""
    for idx in range(12):
        tied_score = 90.0 if idx < 6 else 80.0
        _seed_finding(
            db_session,
            idx=idx,
            risk_score=tied_score,
            risk_band="High",
        )
    db_session.commit()

    response = client.get("/scores/top10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 10
    risk_scores = [item["risk_score"] for item in payload]
    assert risk_scores == sorted(risk_scores, reverse=True)
    assert all(score in {90.0, 80.0} for score in risk_scores)


def test_get_scores_summary_ignores_unknown_band_in_breakdown(client, db_session):
    """Validates unknown bands are excluded from named bucket counts."""
    _seed_finding(db_session, idx=1, risk_score=88.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=10.0, risk_band="Unknown")
    db_session.commit()

    response = client.get("/scores/summary")

    assert response.status_code == 200
    payload = response.json()
    # total includes every row, even those with non-standard labels
    assert payload["total_findings"] == 2
    assert payload["risk_bands"]["Critical"] == 1
    assert payload["risk_bands"]["High"] == 0
    assert payload["risk_bands"]["Medium"] == 0
    assert payload["risk_bands"]["Low"] == 0


def test_get_all_scores_pagination_and_shape(client, db_session):
    """Validates /scores/all pagination metadata and item sorting."""
    for idx in range(7):
        _seed_finding(
            db_session,
            idx=idx,
            risk_score=100.0 - idx,
            risk_band="High",
        )
    db_session.commit()

    response = client.get("/scores/all?page=2&page_size=3")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"items", "total", "page", "page_size"}
    assert payload["total"] == 7
    assert payload["page"] == 2
    assert payload["page_size"] == 3
    assert len(payload["items"]) == 3

    risk_scores = [item["risk_score"] for item in payload["items"]]
    assert risk_scores == sorted(risk_scores, reverse=True)


def test_get_all_scores_rejects_invalid_page_query(client):
    """Validates query parameter constraints return 422 on invalid page."""
    response = client.get("/scores/all?page=0&page_size=10")
    assert response.status_code == 422

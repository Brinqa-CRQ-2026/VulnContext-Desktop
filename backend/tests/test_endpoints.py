from app import models


def _seed_finding(
    db_session,
    *,
    idx: int,
    risk_score: float,
    risk_band: str,
    cvss_score: float = 7.0,
    epss_score: float = 0.4,
    vuln_age_days: int | None = None,
):
    # Minimal row constructor used by endpoint tests to seed the test DB quickly.
    finding = models.ScoredFinding(
        finding_id=f"F-{idx}",
        asset_id=f"A-{idx}",
        asset_criticality=3,
        cvss_score=cvss_score,
        epss_score=epss_score,
        vuln_age_days=vuln_age_days,
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


def test_get_scores_by_band_filters_across_full_dataset(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=95.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=89.0, risk_band="Critical")
    _seed_finding(db_session, idx=3, risk_score=73.0, risk_band="High")
    _seed_finding(db_session, idx=4, risk_score=59.0, risk_band="Medium")
    db_session.commit()

    response = client.get("/scores/band/Critical?page=1&page_size=10")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert all(item["risk_band"] == "Critical" for item in payload["items"])
    risk_scores = [item["risk_score"] for item in payload["items"]]
    assert risk_scores == sorted(risk_scores, reverse=True)


def test_get_scores_by_band_rejects_invalid_band(client):
    response = client.get("/scores/band/Severe?page=1&page_size=10")
    assert response.status_code == 400
    assert "Invalid risk band" in response.json()["detail"]


def test_get_all_scores_supports_cvss_sorting(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=50.0, risk_band="High", cvss_score=9.0)
    _seed_finding(db_session, idx=2, risk_score=70.0, risk_band="Critical", cvss_score=4.0)
    _seed_finding(db_session, idx=3, risk_score=60.0, risk_band="Medium", cvss_score=7.0)
    db_session.commit()

    response = client.get(
        "/scores/all?page=1&page_size=10&sort_by=cvss_score&sort_order=asc"
    )
    assert response.status_code == 200
    payload = response.json()
    values = [item["cvss_score"] for item in payload["items"]]
    assert values == [4.0, 7.0, 9.0]


def test_get_scores_by_band_supports_age_sorting(client, db_session):
    _seed_finding(
        db_session,
        idx=1,
        risk_score=84.0,
        risk_band="Critical",
        vuln_age_days=15,
    )
    _seed_finding(
        db_session,
        idx=2,
        risk_score=86.0,
        risk_band="Critical",
        vuln_age_days=5,
    )
    db_session.commit()

    response = client.get(
        "/scores/band/Critical?page=1&page_size=10&sort_by=vuln_age_days&sort_order=asc"
    )
    assert response.status_code == 200
    payload = response.json()
    values = [item["vuln_age_days"] for item in payload["items"]]
    assert values == [5, 15]


def test_seed_qualys_csv_success(client):
    csv_payload = """finding_id,asset_id,cvss_score,epss_score,internet_exposed,asset_criticality,vuln_age_days,auth_required,times_detected
F-1,A-1,9.8,0.95,true,Critical,30,false,2
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Qualys"},
        files={"file": ("qualys.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["inserted"] == 1
    assert payload["source"] == "Qualys"
    assert payload["total_findings"] == 1

    list_response = client.get("/scores/all?page=1&page_size=10")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["source"] == "Qualys"


def test_seed_qualys_csv_appends_when_rows_already_exist(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=91.0, risk_band="Critical")
    db_session.commit()

    csv_payload = """finding_id,asset_id,cvss_score,epss_score,internet_exposed,asset_criticality,vuln_age_days,auth_required,times_detected
F-2,A-2,9.1,0.88,true,High,14,false,1
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Nessus"},
        files={"file": ("qualys.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["inserted"] == 1
    assert payload["source"] == "Nessus"
    assert payload["total_findings"] == 2


def test_seed_qualys_csv_validates_required_columns(client):
    csv_payload = """finding_id,asset_id,cvss_score,internet_exposed,asset_criticality,vuln_age_days,auth_required,times_detected
F-1,A-1,9.8,true,Critical,30,false,2
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Qualys"},
        files={"file": ("qualys.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 400
    assert "missing required columns" in response.json()["detail"]


def test_seed_qualys_csv_requires_source_name(client):
    csv_payload = """finding_id,asset_id,cvss_score,epss_score,internet_exposed,asset_criticality,vuln_age_days,auth_required,times_detected
F-1,A-1,9.8,0.95,true,Critical,30,false,2
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "   "},
        files={"file": ("qualys.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 400
    assert "Source name is required" in response.json()["detail"]


def test_get_sources_summary_returns_counts_per_source(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=90.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=72.0, risk_band="High")
    db_session.commit()

    # Move one row into another source for coverage.
    db_session.query(models.ScoredFinding).filter(models.ScoredFinding.id == 2).update(
        {models.ScoredFinding.source: "Nessus"}, synchronize_session=False
    )
    db_session.commit()

    response = client.get("/scores/sources")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2

    sources = {item["source"]: item for item in payload}
    assert sources["unknown"]["total_findings"] == 1
    assert sources["unknown"]["risk_bands"]["Critical"] == 1
    assert sources["Nessus"]["total_findings"] == 1
    assert sources["Nessus"]["risk_bands"]["High"] == 1


def test_rename_source_updates_all_rows(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=90.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=70.0, risk_band="High")
    db_session.commit()

    response = client.patch(
        "/scores/sources/unknown",
        json={"new_source": "Qualys"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["old_source"] == "unknown"
    assert payload["new_source"] == "Qualys"
    assert payload["updated_rows"] == 2

    list_response = client.get("/scores/sources")
    sources = {item["source"] for item in list_response.json()}
    assert "Qualys" in sources
    assert "unknown" not in sources


def test_delete_source_removes_whole_source_dataset(client, db_session):
    _seed_finding(db_session, idx=1, risk_score=90.0, risk_band="Critical")
    _seed_finding(db_session, idx=2, risk_score=70.0, risk_band="High")
    db_session.commit()

    db_session.query(models.ScoredFinding).filter(models.ScoredFinding.id == 2).update(
        {models.ScoredFinding.source: "Nessus"}, synchronize_session=False
    )
    db_session.commit()

    response = client.delete("/scores/sources/Nessus")
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "Nessus"
    assert payload["deleted_rows"] == 1
    assert payload["total_findings_remaining"] == 1


def test_get_risk_weights_returns_defaults(client):
    response = client.get("/scores/weights")
    assert response.status_code == 200
    payload = response.json()
    assert payload["cvss_weight"] == 0.30
    assert payload["epss_weight"] == 0.25
    assert payload["internet_exposed_weight"] == 0.20
    assert payload["asset_criticality_weight"] == 0.15
    assert payload["vuln_age_weight"] == 0.10
    assert payload["auth_required_weight"] == -0.10


def test_update_risk_weights_rescores_existing_rows(client, db_session):
    _seed_finding(
        db_session,
        idx=1,
        risk_score=20.0,
        risk_band="Low",
        cvss_score=5.0,
        epss_score=0.10,
        vuln_age_days=5,
    )
    _seed_finding(
        db_session,
        idx=2,
        risk_score=20.0,
        risk_band="Low",
        cvss_score=5.0,
        epss_score=0.10,
        vuln_age_days=365,
    )
    db_session.commit()

    update_response = client.put(
        "/scores/weights",
        json={
            "cvss_weight": 0.0,
            "epss_weight": 0.0,
            "internet_exposed_weight": 0.0,
            "asset_criticality_weight": 0.0,
            "vuln_age_weight": 1.0,
            "auth_required_weight": 0.0,
        },
    )
    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload["updated_rows"] == 2

    list_response = client.get(
        "/scores/all?page=1&page_size=10&sort_by=vuln_age_days&sort_order=asc"
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert items[0]["vuln_age_days"] == 5
    assert items[1]["vuln_age_days"] == 365
    assert items[0]["risk_score"] < items[1]["risk_score"]


def test_update_risk_weights_rejects_invalid_positive_sum(client):
    response = client.put(
        "/scores/weights",
        json={
            "cvss_weight": 0.30,
            "epss_weight": 0.25,
            "internet_exposed_weight": 0.20,
            "asset_criticality_weight": 0.15,
            "vuln_age_weight": 0.20,  # sum becomes 1.10
            "auth_required_weight": -0.10,
        },
    )
    assert response.status_code == 400
    assert "sum to 1.0" in response.json()["detail"]


def test_update_risk_weights_rejects_positive_auth_weight(client):
    response = client.put(
        "/scores/weights",
        json={
            "cvss_weight": 0.30,
            "epss_weight": 0.25,
            "internet_exposed_weight": 0.20,
            "asset_criticality_weight": 0.15,
            "vuln_age_weight": 0.10,
            "auth_required_weight": 0.05,
        },
    )
    assert response.status_code == 400
    assert "auth_required_weight must be <= 0" in response.json()["detail"]

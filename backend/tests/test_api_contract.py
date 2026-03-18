from app import models


def _seed_finding(
    db_session,
    *,
    idx: int,
    source: str = "unknown",
    source_risk_score: float | None = None,
    source_risk_band: str | None = None,
    source_risk_rating: str | None = None,
    internal_risk_score: float | None = None,
    internal_risk_band: str | None = None,
    cvss_score: float | None = None,
    epss_score: float | None = None,
    age_in_days: float | None = None,
    is_kev: bool = False,
):
    finding = models.ScoredFinding(
        source=source,
        uid=f"uid-{idx}",
        record_id=f"record-{idx}",
        display_name=f"Finding {idx}",
        status="Confirmed active",
        status_category="Open",
        source_status="Active",
        severity=source_risk_rating or source_risk_band or "Medium",
        target_names=f"host-{idx}",
        cve_id=f"CVE-2024-{idx:04d}",
        cvss_score=cvss_score,
        epss_score=epss_score,
        age_in_days=age_in_days,
        risk_score=source_risk_score,
        risk_band=source_risk_band,
        risk_rating=source_risk_rating,
        internal_risk_score=internal_risk_score,
        internal_risk_band=internal_risk_band,
        is_kev=is_kev,
    )
    db_session.add(finding)
    return finding


def test_get_scores_summary_empty(client):
    response = client.get("/scores/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_findings"] == 0
    assert payload["risk_bands"] == {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
    }
    assert payload["kevFindingsTotal"] == 0


def test_get_scores_summary_uses_display_risk_band(client, db_session):
    _seed_finding(
        db_session,
        idx=1,
        source_risk_score=45.0,
        source_risk_band="Medium",
        internal_risk_score=91.0,
        internal_risk_band="Critical",
    )
    _seed_finding(
        db_session,
        idx=2,
        source_risk_score=70.0,
        source_risk_band="High",
        is_kev=True,
    )
    db_session.commit()

    response = client.get("/scores/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_findings"] == 2
    assert payload["risk_bands"]["Critical"] == 1
    assert payload["risk_bands"]["High"] == 1
    assert payload["kevFindingsTotal"] == 1
    assert payload["kevRiskBands"]["High"] == 1


def test_get_top10_orders_by_display_risk_score(client, db_session):
    _seed_finding(
        db_session,
        idx=1,
        source_risk_score=99.0,
        source_risk_band="Critical",
        internal_risk_score=35.0,
        internal_risk_band="Low",
    )
    _seed_finding(
        db_session,
        idx=2,
        source_risk_score=70.0,
        source_risk_band="High",
        internal_risk_score=92.0,
        internal_risk_band="Critical",
    )
    db_session.commit()

    response = client.get("/scores/top10")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["uid"] == "uid-2"
    assert payload[0]["risk_score"] == 92.0
    assert payload[0]["source_risk_score"] == 70.0
    assert payload[0]["internal_risk_score"] == 92.0


def test_get_all_scores_returns_new_contract_fields(client, db_session):
    finding = _seed_finding(
        db_session,
        idx=3,
        source="Brinqa",
        source_risk_score=68.0,
        source_risk_band="High",
        internal_risk_score=74.0,
        internal_risk_band="High",
        cvss_score=8.2,
        epss_score=0.44,
        age_in_days=12,
        is_kev=True,
    )
    finding.record_link = "caasm/vulnerabilities/record-3"
    finding.compliance_status = "Out of SLA"
    db_session.commit()

    response = client.get("/scores/all?page=1&page_size=10&sort_by=age_in_days&sort_order=asc")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    item = payload["items"][0]
    assert item["uid"] == "uid-3"
    assert item["record_id"] == "record-3"
    assert item["display_name"] == "Finding 3"
    assert item["risk_score"] == 74.0
    assert item["risk_band"] == "High"
    assert item["source_risk_score"] == 68.0
    assert item["source_risk_band"] == "High"
    assert item["compliance_status"] == "Out of SLA"
    assert item["age_in_days"] == 12
    assert item["isKev"] is True


def test_get_scores_by_band_filters_on_display_band(client, db_session):
    _seed_finding(
        db_session,
        idx=4,
        source_risk_score=40.0,
        source_risk_band="Medium",
        internal_risk_score=90.0,
        internal_risk_band="Critical",
    )
    _seed_finding(
        db_session,
        idx=5,
        source_risk_score=90.0,
        source_risk_band="Critical",
        internal_risk_score=30.0,
        internal_risk_band="Low",
    )
    db_session.commit()

    response = client.get("/scores/band/Critical?page=1&page_size=10")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["uid"] == "uid-4"


def test_get_finding_by_id_returns_new_fields(client, db_session):
    finding = _seed_finding(
        db_session,
        idx=6,
        source="Wiz",
        source_risk_score=51.0,
        source_risk_band="Medium",
        cvss_score=6.7,
        epss_score=0.12,
    )
    finding.summary = "Short summary"
    finding.description = "Long description"
    finding.target_ids = "asset-6"
    db_session.commit()

    response = client.get(f"/scores/findings/{finding.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["uid"] == "uid-6"
    assert payload["target_ids"] == "asset-6"
    assert payload["summary"] == "Short summary"
    assert payload["description"] == "Long description"
    assert payload["risk_score"] == 51.0
    assert payload["source_risk_score"] == 51.0
    assert payload["internal_risk_score"] is None


def test_get_finding_by_id_includes_cve_record_description(client, db_session):
    finding = _seed_finding(
        db_session,
        idx=16,
        source="Wiz",
    )
    finding.cve_id = "CVE-2024-9999"
    db_session.add(
        models.NvdCveCache(
            cve_id="CVE-2024-9999",
            description="Description from the NVD CVE record.",
        )
    )
    db_session.commit()

    response = client.get(f"/scores/findings/{finding.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["cveDescription"] == "Description from the NVD CVE record."


def test_get_sources_summary_groups_by_display_band(client, db_session):
    _seed_finding(
        db_session,
        idx=7,
        source="Brinqa",
        source_risk_score=55.0,
        source_risk_band="Medium",
        internal_risk_score=89.0,
        internal_risk_band="Critical",
    )
    _seed_finding(
        db_session,
        idx=8,
        source="Wiz",
        source_risk_score=72.0,
        source_risk_band="High",
    )
    db_session.commit()

    response = client.get("/scores/sources")

    assert response.status_code == 200
    payload = response.json()
    by_source = {item["source"]: item for item in payload}
    assert by_source["Brinqa"]["risk_bands"]["Critical"] == 1
    assert by_source["Wiz"]["risk_bands"]["High"] == 1


def test_get_risk_weights_returns_current_defaults(client):
    response = client.get("/scores/weights")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "cvss_weight": 0.4,
        "epss_weight": 0.25,
        "kev_weight": 0.25,
        "asset_criticality_weight": 0.15,
        "context_weight": 0.2,
    }


def test_set_finding_disposition_returns_uid_and_records_event(client, db_session):
    finding = _seed_finding(
        db_session,
        idx=9,
        source="Brinqa",
        source_risk_score=64.0,
        source_risk_band="High",
    )
    db_session.commit()

    response = client.post(
        f"/scores/findings/{finding.id}/disposition",
        json={
            "disposition": "false_positive",
            "reason": "validated",
            "comment": "not actionable",
            "actor": "ui",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["uid"] == "uid-9"
    assert payload["record_id"] == "record-9"
    assert payload["disposition"] == "false_positive"

    events = db_session.query(models.FindingEvent).all()
    assert len(events) == 1
    assert events[0].finding_key == "Brinqa:uid-9"

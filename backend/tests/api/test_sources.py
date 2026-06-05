from helpers.findings import seed_asset_and_finding


def test_sources_summary_is_read_only(client, db_session):
    seed_asset_and_finding(db_session, idx=7, risk=6.0)

    response = client.get("/sources")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source"] == "Brinqa"
    assert payload[0]["total_findings"] == 1

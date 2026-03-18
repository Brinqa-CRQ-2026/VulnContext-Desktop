from app import models
from app.seed import (
    enrich_findings_with_epss,
    parse_staged_findings_csv_to_scored_findings,
    refresh_persisted_findings_with_epss,
)


def test_parse_staged_finding_csv_maps_new_schema_fields():
    csv_payload = """uid,display_name,cve_ids,cve_record_names,status,status_category,source_status,compliance_status,severity,risk_factor_names,risk_factor_values,age_in_days,first_found,last_found,due_date,cisa_due_date_expired,target_count,target_ids,target_names,attack_pattern_names,attack_technique_names,attack_tactic_names,base_risk_score,risk_score,risk_rating,id,record_link,summary,description,type_display_name,type_id,date_created,last_updated,sla_days,sla_level,risk_owner_name,remediation_owner_name,source_count,source_uids,source_record_uids,source_links,connector_names,source_connector_names,connector_categories,data_integration_titles,informed_user_names,data_model_name,created_by,updated_by,risk_scoring_model_name,sla_definition_name,confidence,risk_factor_offset,category_count,categories
uid-1,Example Finding,,CVE-2024-0001,Confirmed active,Open,Active,Out of SLA,High,RF1,-1.0,12.5,2024-01-10T00:00:00Z,2024-01-12T00:00:00Z,2024-02-01T00:00:00Z,True,1,target-1,host-1,Pattern A,Technique A,Tactic A,8.8,7.8,High,record-1,caasm/vulnerabilities/record-1,Short summary,Long description,Example Finding,type-1,2025-02-18T17:05:34.603Z,2025-02-19T18:58:49.348Z,30.0,L2,Alice,Bob,1,source-uid-1,source-record-uid-1,source-link-1,Brinqa Connect,Brinqa Connect,Data Store,Wiz,Unknown,Vulnerability,creator@example.com,system,Model A,SLA A,High,-1.0,0,
"""

    rows = parse_staged_findings_csv_to_scored_findings(csv_payload, source="Wiz")

    assert len(rows) == 1
    finding = rows[0]
    assert finding.source == "Wiz"
    assert finding.uid == "uid-1"
    assert finding.record_id == "record-1"
    assert finding.display_name == "Example Finding"
    assert finding.cve_id == "CVE-2024-0001"
    assert finding.risk_score == 7.8
    assert finding.risk_rating == "High"
    assert finding.risk_band == "High"
    assert finding.lifecycle_status == "active"
    assert finding.finding_key == "Wiz:uid-1"
    assert finding.target_names == "host-1"
    assert finding.cisa_due_date_expired is True


def test_parse_staged_finding_csv_maps_fixed_lifecycle():
    csv_payload = """uid,display_name,status,status_category,source_status,risk_rating,id
uid-2,Fixed Finding,Confirmed fixed,Closed,Fixed,Low,record-2
"""

    rows = parse_staged_findings_csv_to_scored_findings(csv_payload, source="Qualys VM")

    assert len(rows) == 1
    finding = rows[0]
    assert finding.lifecycle_status == "fixed"
    assert finding.risk_band == "Low"


def test_seed_endpoint_accepts_new_staged_schema(client):
    csv_payload = """uid,display_name,status,status_category,source_status,risk_rating,id,risk_score
uid-3,Seeded Finding,Confirmed active,Open,Active,Medium,record-3,5.0
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Brinqa"},
        files={"file": ("finding_clean_sample.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["inserted"] == 1
    assert payload["source"] == "Brinqa"
    assert payload["total_findings"] == 1


def test_seed_endpoint_auto_applies_epss(client, db_session, monkeypatch):
    db_session.add(
        models.EpssScore(
            cve_id="CVE-2024-0009",
            probability=0.61,
            percentile=0.88,
        )
    )
    db_session.commit()
    monkeypatch.setattr("app.api.scores.get_epss_scores", lambda: None)

    csv_payload = """uid,display_name,cve_ids,status,status_category,source_status,risk_rating,id
uid-9,Seeded With EPSS,CVE-2024-0009,Confirmed active,Open,Active,Medium,record-9
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Brinqa"},
        files={"file": ("finding_clean_sample.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 200
    finding = db_session.query(models.ScoredFinding).filter_by(uid="uid-9").first()
    assert finding is not None
    assert finding.epss_score == 0.61
    assert finding.epss_percentile == 0.88
    assert finding.internal_risk_score is not None


def test_seed_endpoint_auto_applies_nvd_cache(client, db_session, monkeypatch):
    db_session.add(
        models.NvdCveCache(
            cve_id="CVE-2024-0010",
            cvss_score=9.1,
            cvss_version="3.1",
            cvss_severity="CRITICAL",
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            attack_vector="NETWORK",
            attack_complexity="LOW",
            cwe_ids="CWE-79",
            has_kev=True,
            cisa_required_action="Patch immediately.",
            cisa_vulnerability_name="Example KEV vulnerability",
        )
    )
    db_session.commit()
    monkeypatch.setattr("app.api.scores.get_epss_scores", lambda: None)

    csv_payload = """uid,display_name,cve_ids,status,status_category,source_status,risk_rating,id
uid-10,Seeded With NVD,CVE-2024-0010,Confirmed active,Open,Active,High,record-10
"""

    response = client.post(
        "/scores/seed/qualys-csv",
        data={"source": "Brinqa"},
        files={"file": ("finding_clean_sample.csv", csv_payload, "text/csv")},
    )

    assert response.status_code == 200
    finding = db_session.query(models.ScoredFinding).filter_by(uid="uid-10").first()
    assert finding is not None
    assert finding.cvss_score == 9.1
    assert finding.cvss_version == "3.1"
    assert finding.cwe_ids == "CWE-79"
    assert finding.is_kev is True


def test_enrich_findings_with_epss_maps_local_epss_and_internal_score(db_session):
    db_session.add(
        models.EpssScore(
            cve_id="CVE-2024-0001",
            probability=0.73,
            percentile=0.91,
        )
    )
    db_session.commit()

    csv_payload = """uid,display_name,cve_ids,status,status_category,source_status,risk_rating,id
uid-4,EPSS Enriched Finding,CVE-2024-0001,Confirmed active,Open,Active,Medium,record-4
"""
    rows = parse_staged_findings_csv_to_scored_findings(csv_payload, source="Brinqa")

    enriched = enrich_findings_with_epss(rows, db=db_session)

    assert enriched == 1
    assert rows[0].epss_score == 0.73
    assert rows[0].epss_percentile == 0.91
    assert rows[0].internal_risk_score is not None
    assert rows[0].internal_risk_band in {"Low", "Medium", "High", "Critical"}


def test_refresh_persisted_findings_with_epss_updates_existing_rows(db_session):
    db_session.add(
        models.EpssScore(
            cve_id="CVE-2024-0202",
            probability=0.33,
            percentile=0.77,
        )
    )
    db_session.add(
        models.ScoredFinding(
            uid="uid-refresh-epss",
            source="test",
            cve_id="CVE-2024-0202",
        )
    )
    db_session.commit()

    updated = refresh_persisted_findings_with_epss(db_session)
    refreshed = db_session.query(models.ScoredFinding).filter_by(uid="uid-refresh-epss").first()

    assert updated == 1
    assert refreshed is not None
    assert refreshed.epss_score == 0.33
    assert refreshed.epss_percentile == 0.77

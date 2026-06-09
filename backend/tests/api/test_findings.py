from app import models
from helpers.findings import seed_asset_and_finding


def test_health_docs_and_openapi_are_available(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/api/v1/health").status_code == 200


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

    versioned_summary = client.get("/api/v1/findings/summary")
    assert versioned_summary.status_code == 200

    response = client.get("/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc")
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == ["2002", "2001", "2003"]
    assert items[0]["source"] == "Brinqa"
    assert items[0]["business_service"] == "Business Service 2"
    assert items[0]["application"] == "Application 2"
    assert items[0]["cvss_score"] is None
    assert items[1]["risk_band"] == "Medium"
    assert items[1]["source_risk_band"] == "Critical"
    assert items[1]["score_source"] == "CRQ V4"
    assert items[1]["cvss_score"] == 8.8
    assert items[1]["epss_score"] == 0.42
    assert items[1]["isKev"] is True
    assert items[2]["lifecycle_status"] == "Fixed"

    versioned_response = client.get(
        "/api/v1/findings?page=1&page_size=10&sort_by=risk_score&sort_order=desc"
    )
    assert versioned_response.status_code == 200
    versioned_items = versioned_response.json()["items"]
    assert versioned_items[0]["business_service"] == "Business Service 2"
    assert versioned_items[0]["application"] == "Application 2"


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


def test_findings_detail_returns_nvd_description_for_cve(client, db_session):
    _, finding = seed_asset_and_finding(db_session, idx=6, risk=7.2)
    db_session.add(
        models.NvdRecord(
            cve=finding.cve_id,
            cvss_score=8.1,
            cvss_severity="High",
            description="NVD remediation context for this CVE.",
        )
    )
    db_session.commit()

    response = client.get(f"/findings/{finding.finding_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["cveDescription"] == "NVD remediation context for this CVE."
    assert payload["cvss_score"] == 8.1
    assert payload["cvss_severity"] == "High"


def test_findings_detail_returns_nvd_and_kev_context_for_cve(client, db_session):
    _, finding = seed_asset_and_finding(db_session, idx=7, risk=7.2)
    db_session.add(
        models.NvdRecord(
            cve=finding.cve_id,
            vuln_status="Analyzed",
            description="NVD technical description.",
            cvss_score=9.8,
            cvss_severity="CRITICAL",
            cvss_version="3.1",
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            cvss_exploitability_score=3.9,
            cvss_impact_score=5.9,
            attack_vector="NETWORK",
            attack_complexity="LOW",
            privileges_required="NONE",
            user_interaction="NONE",
            scope="UNCHANGED",
            confidentiality_impact="HIGH",
            integrity_impact="HIGH",
            availability_impact="HIGH",
            primary_cwe_id="CWE-502",
            primary_cwe_description="CWE-502",
            weaknesses=[
                {
                    "cwe_id": "CWE-502",
                    "description": "CWE-502",
                    "source": "nvd@nist.gov",
                    "type": "Primary",
                    "primary": True,
                }
            ],
            affected_products=[
                {
                    "criteria": "cpe:2.3:a:example:widget:1.0:*:*:*:*:*:*:*",
                    "vendor": "example",
                    "product": "widget",
                    "version": "1.0",
                }
            ],
            references=[
                {
                    "url": "https://vendor.example/advisory",
                    "source": "Example Vendor",
                    "tags": ["Vendor Advisory"],
                    "group": "Vendor Advisory",
                }
            ],
            reference_groups={
                "Vendor Advisory": [
                    {
                        "url": "https://vendor.example/advisory",
                        "source": "Example Vendor",
                        "tags": ["Vendor Advisory"],
                        "group": "Vendor Advisory",
                    }
                ]
            },
            cisa_required_action="NVD fallback required action.",
        )
    )
    db_session.add(
        models.KevRecord(
            cve=finding.cve_id,
            date_added="2024-01-08",
            due_date="2024-01-29",
            vendor_project="Example Vendor",
            product="Widget",
            vulnerability_name="Example Widget Vulnerability",
            short_description="Example KEV short description.",
        )
    )
    db_session.commit()

    response = client.get(f"/findings/{finding.finding_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["isKev"] is True
    assert payload["cveDescription"] == "NVD technical description."
    assert payload["nvd_vuln_status"] == "Analyzed"
    assert payload["cvss_score"] == 9.8
    assert payload["cvss_version"] == "3.1"
    assert payload["cvss_vector"] == "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    assert payload["cvss_exploitability_score"] == 3.9
    assert payload["cvss_impact_score"] == 5.9
    assert payload["attack_vector"] == "NETWORK"
    assert payload["attack_complexity"] == "LOW"
    assert payload["privileges_required"] == "NONE"
    assert payload["user_interaction"] == "NONE"
    assert payload["scope"] == "UNCHANGED"
    assert payload["confidentiality_impact"] == "HIGH"
    assert payload["integrity_impact"] == "HIGH"
    assert payload["availability_impact"] == "HIGH"
    assert payload["primary_cwe_id"] == "CWE-502"
    assert payload["weaknesses"][0]["primary"] is True
    assert payload["affected_products"][0]["product"] == "widget"
    assert payload["references"][0]["group"] == "Vendor Advisory"
    assert (
        payload["reference_groups"]["Vendor Advisory"][0]["url"]
        == "https://vendor.example/advisory"
    )
    assert payload["kevDateAdded"].startswith("2024-01-08")
    assert payload["kevDueDate"].startswith("2024-01-29")
    assert payload["kevVendorProject"] == "Example Vendor"
    assert payload["kevProduct"] == "Widget"
    assert payload["kevVulnerabilityName"] == "Example Widget Vulnerability"
    assert payload["kevShortDescription"] == "Example KEV short description."
    assert payload["kevRequiredAction"] == "NVD fallback required action."

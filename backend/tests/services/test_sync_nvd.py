from scripts.automation.sync_nvd import parse_nvd_record, upload_record


def nvd_item(cve_overrides=None):
    cve = {
        "id": "CVE-2026-12345",
        "vulnStatus": "Analyzed",
        "published": "2026-01-02T03:04:05.000",
        "lastModified": "2026-02-03T04:05:06.000",
        "descriptions": [
            {"lang": "es", "value": "Descripcion alternativa."},
            {"lang": "en", "value": "English CVE description."},
        ],
        "cisaExploitAdd": "2026-03-01",
        "cisaActionDue": "2026-03-22",
        "cisaRequiredAction": "Apply vendor remediation.",
        "cisaVulnerabilityName": "Example Product Vulnerability",
        "metrics": {
            "cvssMetricV30": [
                {
                    "type": "Primary",
                    "cvssData": {
                        "version": "3.0",
                        "baseScore": 7.1,
                        "baseSeverity": "HIGH",
                        "vectorString": "CVSS:3.0/AV:L/AC:H/PR:L/UI:R/S:U/C:H/I:L/A:L",
                    },
                }
            ],
            "cvssMetricV31": [
                {
                    "type": "Primary",
                    "exploitabilityScore": 3.9,
                    "impactScore": 5.9,
                    "cvssData": {
                        "version": "3.1",
                        "baseScore": 9.8,
                        "baseSeverity": "CRITICAL",
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                        "privilegesRequired": "NONE",
                        "userInteraction": "NONE",
                        "scope": "UNCHANGED",
                        "confidentialityImpact": "HIGH",
                        "integrityImpact": "HIGH",
                        "availabilityImpact": "HIGH",
                    },
                }
            ],
        },
        "weaknesses": [
            {
                "source": "nvd@nist.gov",
                "type": "Primary",
                "description": [{"lang": "en", "value": "CWE-444"}],
            },
            {
                "source": "nvd@nist.gov",
                "type": "Secondary",
                "description": [{"lang": "en", "value": "CWE-20"}],
            },
        ],
        "configurations": [
            {
                "nodes": [
                    {
                        "operator": "OR",
                        "cpeMatch": [
                            {
                                "vulnerable": True,
                                "criteria": "cpe:2.3:a:example:widget:1.0:*:*:*:*:*:*:*",
                                "versionStartIncluding": "1.0",
                                "versionEndExcluding": "1.5",
                            },
                            {
                                "vulnerable": False,
                                "criteria": "cpe:2.3:a:example:widget:2.0:*:*:*:*:*:*:*",
                            },
                        ],
                    }
                ]
            }
        ],
        "references": [
            {
                "url": "https://vendor.example/advisory",
                "source": "Example Vendor",
                "tags": ["Vendor Advisory"],
            },
            {
                "url": "https://vendor.example/releases/fix",
                "source": "Example Vendor",
                "tags": ["Patch"],
            },
            {
                "url": "https://research.example/analysis",
                "source": "Researcher",
                "tags": ["Technical Description"],
            },
            {
                "url": "https://github.com/example/poc",
                "source": "GitHub",
                "tags": ["Exploit"],
            },
            {
                "url": "https://nvd.nist.gov/vuln/detail/CVE-2026-12345",
                "source": "NVD",
                "tags": [],
            },
        ],
    }
    if cve_overrides:
        cve.update(cve_overrides)
    return {"cve": cve}


def test_parse_nvd_record_extracts_full_finding_enrichment():
    record = parse_nvd_record(nvd_item())

    assert record["cve"] == "CVE-2026-12345"
    assert record["description"] == "English CVE description."
    assert record["vuln_status"] == "Analyzed"
    assert record["published"] == "2026-01-02T03:04:05.000"
    assert record["last_modified"] == "2026-02-03T04:05:06.000"
    assert record["cvss_version"] == "3.1"
    assert record["cvss_score"] == 9.8
    assert record["cvss_severity"] == "CRITICAL"
    assert record["cvss_vector"] == "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    assert record["cvss_exploitability_score"] == 3.9
    assert record["cvss_impact_score"] == 5.9
    assert record["attack_vector"] == "NETWORK"
    assert record["attack_complexity"] == "LOW"
    assert record["privileges_required"] == "NONE"
    assert record["user_interaction"] == "NONE"
    assert record["scope"] == "UNCHANGED"
    assert record["confidentiality_impact"] == "HIGH"
    assert record["integrity_impact"] == "HIGH"
    assert record["availability_impact"] == "HIGH"
    assert record["primary_cwe_id"] == "CWE-444"
    assert record["weaknesses"][0]["primary"] is True
    assert record["weaknesses"][1]["cwe_id"] == "CWE-20"
    assert record["affected_products"] == [
        {
            "criteria": "cpe:2.3:a:example:widget:1.0:*:*:*:*:*:*:*",
            "vendor": "example",
            "product": "widget",
            "version": "1.0",
            "version_start_including": "1.0",
            "version_start_excluding": None,
            "version_end_including": None,
            "version_end_excluding": "1.5",
        }
    ]
    assert set(record["reference_groups"]) == {
        "Vendor Advisory",
        "Patch / Release Notes",
        "Technical Analysis",
        "Exploit / PoC",
        "NVD / CVE Record",
    }
    assert record["cisa_required_action"] == "Apply vendor remediation."
    assert record["cisa_vulnerability_name"] == "Example Product Vulnerability"


def test_parse_nvd_record_falls_back_to_cvss_v4_then_v2():
    v4_record = parse_nvd_record(
        nvd_item(
            {
                "metrics": {
                    "cvssMetricV40": [
                        {
                            "cvssData": {
                                "baseScore": 8.7,
                                "baseSeverity": "HIGH",
                                "vectorString": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
                                "attackVector": "NETWORK",
                                "attackComplexity": "LOW",
                                "privilegesRequired": "NONE",
                                "userInteraction": "NONE",
                                "vulnConfidentialityImpact": "HIGH",
                            }
                        }
                    ]
                }
            }
        )
    )
    assert v4_record["cvss_version"] == "4.0"
    assert v4_record["cvss_score"] == 8.7
    assert v4_record["confidentiality_impact"] == "HIGH"

    v2_record = parse_nvd_record(
        nvd_item(
            {
                "metrics": {
                    "cvssMetricV2": [
                        {
                            "baseSeverity": "MEDIUM",
                            "exploitabilityScore": 8.0,
                            "impactScore": 2.9,
                            "cvssData": {
                                "baseScore": 5.0,
                                "vectorString": "AV:N/AC:L/Au:N/C:P/I:N/A:N",
                            },
                        }
                    ]
                }
            }
        )
    )
    assert v2_record["cvss_version"] == "2.0"
    assert v2_record["cvss_score"] == 5.0
    assert v2_record["cvss_severity"] == "MEDIUM"
    assert v2_record["attack_vector"] is None


def test_upload_record_scores_only_limits_refresh_payload():
    record = parse_nvd_record(nvd_item())

    filtered = upload_record(record, scores_only=True)

    assert filtered == {
        "cve": "CVE-2026-12345",
        "cvss_score": 9.8,
        "cvss_severity": "CRITICAL",
        "cvss_version": "3.1",
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "cvss_exploitability_score": 3.9,
        "cvss_impact_score": 5.9,
    }
    assert "_metric_source" not in upload_record(record, scores_only=False)

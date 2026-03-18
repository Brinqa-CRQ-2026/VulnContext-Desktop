from pathlib import Path

from app import models
from app.services.nvd_enrichment import (
    build_bootstrap_feed_urls,
    build_modified_feed_url,
    enrich_findings_with_nvd_cache,
    extract_cvss,
    ingest_feed_file,
    parse_nvd_cve_item,
    refresh_persisted_findings_with_nvd_cache,
)


def test_extract_cvss_prefers_v31():
    result = extract_cvss(
        {
            "cvssMetricV31": [
                {
                    "baseSeverity": "HIGH",
                    "cvssData": {
                        "version": "3.1",
                        "baseScore": 8.8,
                        "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                        "attackVector": "NETWORK",
                        "attackComplexity": "LOW",
                    },
                }
            ],
            "cvssMetricV2": [
                {
                    "baseSeverity": "MEDIUM",
                    "cvssData": {"version": "2.0", "baseScore": 5.0},
                }
            ],
        }
    )

    assert result["cvss_version"] == "3.1"
    assert result["cvss_base_score"] == 8.8
    assert result["cvss_severity"] == "HIGH"


def test_build_feed_urls():
    urls = build_bootstrap_feed_urls(start_year=2024)
    assert "2024" in urls
    assert urls["2024"].endswith("nvdcve-2.0-2024.json.gz")
    assert build_modified_feed_url().endswith("nvdcve-2.0-modified.json.gz")


def test_parse_nvd_cve_item_maps_cisa_and_cvss():
    result = parse_nvd_cve_item(
        {
            "id": "CVE-2023-1234",
            "sourceIdentifier": "nvd@nist.gov",
            "vulnStatus": "Analyzed",
            "published": "2023-01-01T00:00:00.000",
            "lastModified": "2023-01-02T00:00:00.000",
            "cisaExploitAdd": "2023-03-01",
            "cisaActionDue": "2023-03-21",
            "cisaRequiredAction": "Patch now.",
            "cisaVulnerabilityName": "Example vuln",
            "descriptions": [{"lang": "en", "value": "Example vulnerability."}],
            "references": [{"url": "https://example.com/advisory"}],
            "weaknesses": [{"description": [{"lang": "en", "value": "CWE-79"}]}],
            "metrics": {
                "cvssMetricV31": [
                    {
                        "baseSeverity": "CRITICAL",
                        "cvssData": {
                            "version": "3.1",
                            "baseScore": 9.8,
                            "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            "attackVector": "NETWORK",
                            "attackComplexity": "LOW",
                        },
                    }
                ]
            },
        }
    )

    assert result["cve_id"] == "CVE-2023-1234"
    assert result["has_kev"] is True
    assert result["cvss_score"] == 9.8
    assert result["cwe_ids"] == "CWE-79"


def test_ingest_feed_file_loads_rows(tmp_path, db_session):
    feed_path = tmp_path / "2024.json.gz"
    feed_path.write_bytes(
        __import__("gzip").compress(
            b'{"vulnerabilities":[{"cve":{"id":"CVE-2024-0001","published":"2024-01-01T00:00:00.000","lastModified":"2024-01-02T00:00:00.000","descriptions":[{"lang":"en","value":"One"}],"references":[{"url":"https://example.com/1"}]}}]}'
        )
    )

    ingested = ingest_feed_file(feed_path, db_session)

    assert ingested == 1
    assert db_session.query(models.NvdCveCache).count() == 1


def test_enrich_findings_with_nvd_cache_maps_cvss_and_kev(db_session):
    db_session.add(
        models.NvdCveCache(
            cve_id="CVE-2023-1234",
            cwe_ids="CWE-79",
            cvss_score=9.8,
            cvss_version="3.1",
            cvss_severity="CRITICAL",
            cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            attack_vector="NETWORK",
            attack_complexity="LOW",
            has_kev=True,
            cisa_required_action="Patch now.",
            cisa_vulnerability_name="Example vuln",
        )
    )
    db_session.commit()

    findings = [
        models.ScoredFinding(
            uid="uid-1",
            source="test",
            cve_id="CVE-2023-1234",
            epss_score=0.5,
        )
    ]

    enriched = enrich_findings_with_nvd_cache(findings, db=db_session)

    assert enriched == 1
    assert findings[0].cwe_ids == "CWE-79"
    assert findings[0].cvss_score == 9.8
    assert findings[0].cvss_version == "3.1"
    assert findings[0].is_kev is True
    assert findings[0].kev_required_action == "Patch now."


def test_refresh_persisted_findings_with_nvd_cache_updates_existing_rows(db_session):
    db_session.add(
        models.NvdCveCache(
            cve_id="CVE-2024-2222",
            cvss_score=8.8,
            cvss_version="3.1",
            cvss_severity="HIGH",
            cwe_ids="CWE-89",
            has_kev=False,
        )
    )
    db_session.add(
        models.ScoredFinding(
            uid="uid-refresh-1",
            source="test",
            cve_id="CVE-2024-2222",
        )
    )
    db_session.commit()

    updated = refresh_persisted_findings_with_nvd_cache(db_session)
    refreshed = db_session.query(models.ScoredFinding).filter_by(uid="uid-refresh-1").first()

    assert updated == 1
    assert refreshed is not None
    assert refreshed.cvss_score == 8.8
    assert refreshed.cwe_ids == "CWE-89"

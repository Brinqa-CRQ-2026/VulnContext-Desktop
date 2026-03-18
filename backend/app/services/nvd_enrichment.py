from __future__ import annotations

import gzip
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.core.env import load_backend_env
from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights
from app.models import NvdCveCache, ScoredFinding
from app.scoring import score_finding_dict


NVD_FEED_BASE_URL = "https://nvd.nist.gov/feeds/json/cve/2.0"
DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_START_YEAR = 2002


def _parse_datetime(value: str | None) -> datetime | None:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def get_nvd_feed_base_url() -> str:
    load_backend_env()
    return (os.getenv("NVD_FEED_BASE_URL") or NVD_FEED_BASE_URL).strip() or NVD_FEED_BASE_URL


def get_nvd_timeout_seconds() -> int:
    load_backend_env()
    raw = (os.getenv("NVD_TIMEOUT_SEC") or "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    return max(1, int(raw))


def get_nvd_feed_start_year() -> int:
    load_backend_env()
    raw = (os.getenv("NVD_FEED_START_YEAR") or "").strip()
    if not raw:
        return DEFAULT_START_YEAR
    return max(DEFAULT_START_YEAR, int(raw))


def get_nvd_feed_data_dir() -> Path:
    load_backend_env()
    raw = (os.getenv("NVD_FEED_DATA_DIR") or "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parents[2] / "data" / "nvd"


def build_bootstrap_feed_urls(*, start_year: int | None = None) -> dict[str, str]:
    first_year = start_year or get_nvd_feed_start_year()
    current_year = datetime.now(UTC).year
    base_url = get_nvd_feed_base_url().rstrip("/")
    return {
        str(year): f"{base_url}/nvdcve-2.0-{year}.json.gz"
        for year in range(first_year, current_year + 1)
    }


def build_modified_feed_url() -> str:
    base_url = get_nvd_feed_base_url().rstrip("/")
    return f"{base_url}/nvdcve-2.0-modified.json.gz"


def download_feed(url: str, dest: Path, *, timeout_seconds: int | None = None) -> None:
    response = requests.get(url, timeout=timeout_seconds or get_nvd_timeout_seconds())
    response.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(response.content)


def extract_description(cve: dict[str, Any]) -> str | None:
    for item in cve.get("descriptions") or []:
        if item.get("lang") == "en" and item.get("value"):
            return item["value"]
    return None


def extract_cwe_ids(cve: dict[str, Any]) -> str | None:
    cwe_ids: set[str] = set()
    for weakness in cve.get("weaknesses") or []:
        for description in weakness.get("description") or []:
            value = (description.get("value") or "").strip()
            if value:
                cwe_ids.add(value)
    return ", ".join(sorted(cwe_ids)) if cwe_ids else None


def extract_cvss(metrics: dict[str, Any] | None) -> dict[str, Any]:
    result = {
        "cvss_version": None,
        "cvss_base_score": None,
        "cvss_severity": None,
        "cvss_vector": None,
        "attack_vector": None,
        "attack_complexity": None,
    }

    if not metrics:
        return result

    for key in ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        items = metrics.get(key) or []
        if not items:
            continue

        item = items[0]
        cvss_data = item.get("cvssData") or {}
        if not cvss_data:
            continue

        result["cvss_version"] = cvss_data.get("version")
        result["cvss_base_score"] = cvss_data.get("baseScore")
        result["cvss_severity"] = item.get("baseSeverity") or cvss_data.get("baseSeverity")
        result["cvss_vector"] = cvss_data.get("vectorString") or cvss_data.get("vector")
        result["attack_vector"] = cvss_data.get("attackVector") or cvss_data.get("accessVector")
        result["attack_complexity"] = cvss_data.get("attackComplexity") or cvss_data.get("accessComplexity")
        return result

    return result


def parse_nvd_cve_item(cve: dict[str, Any]) -> dict[str, Any]:
    metrics = extract_cvss(cve.get("metrics") or {})
    references = cve.get("references") or []
    reference_urls = [ref.get("url") for ref in references if ref.get("url")]
    cisa_exploit_add = _parse_datetime(cve.get("cisaExploitAdd"))

    return {
        "cve_id": (cve.get("id") or "").strip().upper(),
        "source_identifier": cve.get("sourceIdentifier"),
        "vuln_status": cve.get("vulnStatus"),
        "published": _parse_datetime(cve.get("published")),
        "last_modified": _parse_datetime(cve.get("lastModified")),
        "description": extract_description(cve),
        "cwe_ids": extract_cwe_ids(cve),
        "reference_urls": " | ".join(reference_urls) if reference_urls else None,
        "cvss_score": metrics.get("cvss_base_score"),
        "cvss_vector": metrics.get("cvss_vector"),
        "cvss_version": metrics.get("cvss_version"),
        "cvss_severity": metrics.get("cvss_severity"),
        "attack_vector": metrics.get("attack_vector"),
        "attack_complexity": metrics.get("attack_complexity"),
        "cisa_exploit_add": cisa_exploit_add,
        "cisa_action_due": _parse_datetime(cve.get("cisaActionDue")),
        "cisa_required_action": cve.get("cisaRequiredAction"),
        "cisa_vulnerability_name": cve.get("cisaVulnerabilityName"),
        "has_kev": bool(cisa_exploit_add),
    }


def upsert_nvd_cve(db: Session, row: dict[str, Any]) -> None:
    db.merge(NvdCveCache(**row))


def ingest_feed_file(gz_path: Path, db: Session) -> int:
    with gzip.open(gz_path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)

    vulns = payload.get("vulnerabilities") or []
    for item in vulns:
        cve = (item or {}).get("cve") or {}
        row = parse_nvd_cve_item(cve)
        if row["cve_id"]:
            upsert_nvd_cve(db, row)

    db.commit()
    return len(vulns)


def bootstrap_nvd_cache(db: Session, *, start_year: int | None = None) -> dict[str, int]:
    data_dir = get_nvd_feed_data_dir()
    feed_urls = build_bootstrap_feed_urls(start_year=start_year)
    total_rows = 0

    for year, url in feed_urls.items():
        out = data_dir / f"{year}.json.gz"
        download_feed(url, out)
        total_rows += ingest_feed_file(out, db)

    return {"feeds_processed": len(feed_urls), "rows_seen": total_rows}


def update_nvd_cache_from_modified_feed(db: Session) -> dict[str, int]:
    data_dir = get_nvd_feed_data_dir()
    out = data_dir / "modified.json.gz"
    download_feed(build_modified_feed_url(), out)
    rows_seen = ingest_feed_file(out, db)
    return {"feeds_processed": 1, "rows_seen": rows_seen}


def enrich_findings_with_nvd_cache(
    findings: list[ScoredFinding],
    *,
    db: Session,
    weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
) -> int:
    cve_ids = sorted({finding.cve_id for finding in findings if finding.cve_id})
    if not cve_ids:
        return 0

    cache_rows = db.query(NvdCveCache).filter(NvdCveCache.cve_id.in_(cve_ids)).all()
    cache_by_cve = {row.cve_id.upper(): row for row in cache_rows if row.cve_id}

    enriched = 0
    for finding in findings:
        if not finding.cve_id:
            continue
        cached = cache_by_cve.get(finding.cve_id.upper())
        if cached is None:
            continue

        finding.cwe_ids = cached.cwe_ids
        finding.cvss_score = cached.cvss_score
        finding.cvss_version = cached.cvss_version
        finding.cvss_severity = cached.cvss_severity
        finding.cvss_vector = cached.cvss_vector
        finding.attack_vector = cached.attack_vector
        finding.attack_complexity = cached.attack_complexity
        finding.is_kev = bool(cached.has_kev)
        finding.kev_date_added = cached.cisa_exploit_add
        finding.kev_due_date = cached.cisa_action_due
        finding.kev_required_action = cached.cisa_required_action
        finding.kev_vulnerability_name = cached.cisa_vulnerability_name

        scored = score_finding_dict(
            {
                "cvss_score": finding.cvss_score,
                "epss_score": finding.epss_score,
                "asset_criticality": finding.asset_criticality,
                "context_score": finding.context_score,
                "is_kev": finding.is_kev,
            },
            weights=weights,
        )
        finding.internal_risk_score = scored["internal_risk_score"]
        finding.internal_risk_band = scored["internal_risk_band"]
        enriched += 1

    return enriched


def refresh_persisted_findings_with_nvd_cache(
    db: Session,
    *,
    weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
) -> int:
    findings = (
        db.query(ScoredFinding)
        .filter(ScoredFinding.cve_id.is_not(None))
        .all()
    )
    if not findings:
        return 0

    return enrich_findings_with_nvd_cache(findings, db=db, weights=weights)

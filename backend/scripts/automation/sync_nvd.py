import os
import sys
import time
import argparse
import gzip
import json
import re
from collections import defaultdict
from io import BytesIO
from pathlib import Path

import requests
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
NVD_API_KEY = os.getenv("NVD_API_KEY")

BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
FEED_URL_TEMPLATE = "https://nvd.nist.gov/feeds/json/cve/2.0/nvdcve-2.0-{year}.json.gz"
PAGE_SIZE = 2000
BATCH_SIZE = 500
DELAY = 2
SUPABASE_SELECT_PAGE_SIZE = 1000
REFERENCE_GROUPS = (
    "Vendor Advisory",
    "Patch / Release Notes",
    "Technical Analysis",
    "Exploit / PoC",
    "NVD / CVE Record",
    "Other",
)
SCORES_ONLY_FIELDS = {
    "cve",
    "cvss_score",
    "cvss_severity",
    "cvss_version",
    "cvss_vector",
    "cvss_exploitability_score",
    "cvss_impact_score",
    "_metric_source",
}


def log(message):
    print(message, flush=True)


def require_env():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


def build_parser():
    parser = argparse.ArgumentParser(description="Sync NVD CVE CVSS data into Supabase.")
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Fetch one known CVE and print parsed CVSS without uploading.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Optional page limit for manual GitHub Actions testing.",
    )
    parser.add_argument(
        "--scores-only",
        action="store_true",
        help="Only upload CVSS score/severity fields, leaving existing descriptions unchanged.",
    )
    parser.add_argument(
        "--findings-only",
        action="store_true",
        help=(
            "Only refresh NVD rows for CVEs currently present in findings, "
            "using NVD yearly feeds instead of the full API sync."
        ),
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=BATCH_SIZE,
        help=f"Supabase upsert batch size. Defaults to {BATCH_SIZE}.",
    )
    return parser


def safe_request(params):
    headers = {"User-Agent": "nvd-script"}
    if NVD_API_KEY:
        headers["apiKey"] = NVD_API_KEY
    attempts = 0
    while True:
        try:
            attempts += 1
            r = requests.get(BASE_URL, params=params, headers=headers, timeout=60)
            if r.status_code == 429:
                log(
                    "NVD rate limited request "
                    f"startIndex={params.get('startIndex')} attempt={attempts}; sleeping 30s."
                )
                time.sleep(30)
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as exc:
            log(
                "NVD request failed "
                f"startIndex={params.get('startIndex')} attempt={attempts}: {exc}; sleeping 10s."
            )
            time.sleep(10)


def english_value(items):
    for item in items or []:
        if item.get("lang") == "en" and item.get("value"):
            return item.get("value")
    for item in items or []:
        if item.get("value"):
            return item.get("value")
    return None


def selected_metric(metrics):
    metric_order = (
        ("cvssMetricV31", "3.1"),
        ("cvssMetricV30", "3.0"),
        ("cvssMetricV40", "4.0"),
        ("cvssMetricV2", "2.0"),
    )
    for metric_key, version in metric_order:
        metric_entries = metrics.get(metric_key) or []
        if metric_entries:
            metric = metric_entries[0] or {}
            return metric_key, version, metric, metric.get("cvssData") or {}
    return None, None, {}, {}


def cvss_display_fields(cvss_data):
    return {
        "attack_vector": cvss_data.get("attackVector"),
        "attack_complexity": cvss_data.get("attackComplexity"),
        "privileges_required": cvss_data.get("privilegesRequired"),
        "user_interaction": cvss_data.get("userInteraction"),
        "scope": cvss_data.get("scope"),
        "confidentiality_impact": (
            cvss_data.get("confidentialityImpact")
            or cvss_data.get("vulnConfidentialityImpact")
        ),
        "integrity_impact": (
            cvss_data.get("integrityImpact")
            or cvss_data.get("vulnIntegrityImpact")
        ),
        "availability_impact": (
            cvss_data.get("availabilityImpact")
            or cvss_data.get("vulnAvailabilityImpact")
        ),
    }


def parse_weaknesses(cve_data):
    parsed = []
    for weakness in cve_data.get("weaknesses") or []:
        value = english_value(weakness.get("description") or [])
        if not value:
            continue
        cwe_match = re.search(r"\bCWE-\d+\b", value)
        parsed.append(
            {
                "cwe_id": cwe_match.group(0) if cwe_match else None,
                "description": value,
                "source": weakness.get("source"),
                "type": weakness.get("type"),
                "primary": False,
            }
        )
    if parsed:
        parsed[0]["primary"] = True
    return parsed


def normalize_cpe_part(value):
    if value in (None, "", "*", "-"):
        return None
    return value.replace("\\:", ":").replace("\\/", "/")


def parse_cpe_criteria(criteria):
    if not criteria:
        return {}
    parts = criteria.split(":")
    if len(parts) < 6 or parts[0] != "cpe" or parts[1] != "2.3":
        return {}
    return {
        "vendor": normalize_cpe_part(parts[3]),
        "product": normalize_cpe_part(parts[4]),
        "version": normalize_cpe_part(parts[5]),
    }


def iter_cpe_matches(nodes):
    for node in nodes or []:
        for match in node.get("cpeMatch") or []:
            yield match
        yield from iter_cpe_matches(node.get("nodes") or [])


def parse_affected_products(cve_data):
    products = []
    for config in cve_data.get("configurations") or []:
        for match in iter_cpe_matches(config.get("nodes") or []):
            if match.get("vulnerable") is not True:
                continue
            criteria = match.get("criteria")
            product = {
                "criteria": criteria,
                **parse_cpe_criteria(criteria),
                "version_start_including": match.get("versionStartIncluding"),
                "version_start_excluding": match.get("versionStartExcluding"),
                "version_end_including": match.get("versionEndIncluding"),
                "version_end_excluding": match.get("versionEndExcluding"),
            }
            products.append(product)
    return products


def reference_group(reference):
    url = (reference.get("url") or "").lower()
    source = (reference.get("source") or "").lower()
    tags = [str(tag).lower() for tag in reference.get("tags") or []]
    haystack = " ".join([url, source, *tags])

    if any(token in haystack for token in ("exploit", "proof-of-concept", "poc", "packetstorm", "metasploit")):
        return "Exploit / PoC"
    if any(token in haystack for token in ("patch", "release notes", "release-note", "mitigation", "update", "fix")):
        return "Patch / Release Notes"
    if any(token in haystack for token in ("technical description", "technical", "analysis", "article", "third party advisory")):
        return "Technical Analysis"
    if any(token in haystack for token in ("vendor advisory", "vendor")):
        return "Vendor Advisory"
    if any(token in haystack for token in ("nvd.nist.gov", "cve.org", "mitre.org", "cve record")):
        return "NVD / CVE Record"
    return "Other"


def parse_references(cve_data):
    references = []
    grouped = {group: [] for group in REFERENCE_GROUPS}
    for reference in cve_data.get("references") or []:
        url = reference.get("url")
        if not url:
            continue
        parsed = {
            "url": url,
            "source": reference.get("source"),
            "tags": reference.get("tags") or [],
            "group": reference_group(reference),
        }
        references.append(parsed)
        grouped[parsed["group"]].append(parsed)
    return references, {group: refs for group, refs in grouped.items() if refs}


def upload_record(record, *, scores_only):
    if not scores_only:
        return {key: value for key, value in record.items() if not key.startswith("_")}
    return {
        key: value
        for key, value in record.items()
        if key in SCORES_ONLY_FIELDS and not key.startswith("_")
    }


def parse_nvd_record(v):
    cve_data = v.get("cve", {})
    cve_id = cve_data.get("id")

    desc = english_value(cve_data.get("descriptions") or [])

    metrics = cve_data.get("metrics", {})
    metric_source, cvss_version, metric, cvss = selected_metric(metrics)
    weaknesses = parse_weaknesses(cve_data)
    primary_weakness = weaknesses[0] if weaknesses else {}
    references, reference_groups = parse_references(cve_data)

    return {
        "cve": cve_id,
        "vuln_status": cve_data.get("vulnStatus"),
        "published": cve_data.get("published"),
        "last_modified": cve_data.get("lastModified"),
        "description": desc,
        "cvss_score": cvss.get("baseScore"),
        "cvss_severity": cvss.get("baseSeverity") or metric.get("baseSeverity"),
        "cvss_version": cvss_version,
        "cvss_vector": cvss.get("vectorString"),
        "cvss_exploitability_score": metric.get("exploitabilityScore"),
        "cvss_impact_score": metric.get("impactScore"),
        **cvss_display_fields(cvss),
        "primary_cwe_id": primary_weakness.get("cwe_id"),
        "primary_cwe_description": primary_weakness.get("description"),
        "weaknesses": weaknesses,
        "affected_products": parse_affected_products(cve_data),
        "references": references,
        "reference_groups": reference_groups,
        "cisa_exploit_add": cve_data.get("cisaExploitAdd"),
        "cisa_action_due": cve_data.get("cisaActionDue"),
        "cisa_required_action": cve_data.get("cisaRequiredAction"),
        "cisa_vulnerability_name": cve_data.get("cisaVulnerabilityName"),
        "_metric_source": metric_source,
    }


def upload_batch(supabase, batch):
    supabase.table("nvd").upsert(batch, on_conflict="cve").execute()
    return len(batch)


def upload_records(supabase, records, *, batch_size):
    uploaded = 0
    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        uploaded += upload_batch(supabase, batch)
    return uploaded


def smoke_test():
    cve = "CVE-2022-25434"
    response = safe_request({"cveId": cve})
    vulns = response.json().get("vulnerabilities", [])
    if not vulns:
        raise RuntimeError(f"NVD smoke test did not return {cve}.")
    record = parse_nvd_record(vulns[0])
    log(
        "NVD smoke test parsed "
        f"cve={record['cve']} metric={record['_metric_source']} "
        f"version={record['cvss_version']} score={record['cvss_score']} "
        f"severity={record['cvss_severity']} weaknesses={len(record['weaknesses'])} "
        f"affected_products={len(record['affected_products'])} "
        f"references={len(record['references'])} "
        f"has_cisa={bool(record['cisa_required_action'] or record['cisa_exploit_add'])}."
    )
    if record["cvss_score"] is None:
        raise RuntimeError("NVD smoke test parsed a null CVSS score.")


def finding_cves(supabase):
    cves = set()
    offset = 0
    while True:
        response = (
            supabase.table("findings")
            .select("cve_id")
            .not_.is_("cve_id", "null")
            .range(offset, offset + SUPABASE_SELECT_PAGE_SIZE - 1)
            .execute()
        )
        rows = response.data or []
        for row in rows:
            cve = (row.get("cve_id") or "").strip()
            if cve:
                cves.add(cve)
        if len(rows) < SUPABASE_SELECT_PAGE_SIZE:
            break
        offset += SUPABASE_SELECT_PAGE_SIZE
        log(f"Loaded finding CVEs page offset={offset} distinct_cves={len(cves)}.")
    return cves


def cves_by_year(cves):
    grouped = defaultdict(set)
    for cve in cves:
        match = re.match(r"^CVE-(\d{4})-", cve)
        if match:
            grouped[match.group(1)].add(cve)
    return grouped


def fetch_year_feed(year):
    url = FEED_URL_TEMPLATE.format(year=year)
    log(f"Downloading NVD year feed year={year} url={url}.")
    response = requests.get(
        url,
        headers={"User-Agent": "vulncontext-nvd-feed-sync"},
        timeout=180,
    )
    if response.status_code == 404:
        log(f"NVD year feed not available year={year}; skipping.")
        return None
    response.raise_for_status()
    with gzip.open(BytesIO(response.content), "rt", encoding="utf-8") as feed:
        return json.load(feed)


def process_findings_only(*, scores_only=False, batch_size=BATCH_SIZE):
    from supabase import create_client

    if batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0.")

    require_env()
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    cves = finding_cves(supabase)
    grouped = cves_by_year(cves)
    log(
        "Starting findings-only NVD sync "
        f"distinct_cves={len(cves)} years={','.join(sorted(grouped))} "
        f"scores_only={scores_only} batch_size={batch_size}."
    )

    total_matched = 0
    total_uploaded = 0
    total_with_cvss = 0

    for year in sorted(grouped):
        wanted = grouped[year]
        data = fetch_year_feed(year)
        if data is None:
            log(
                "NVD findings-only year skipped "
                f"year={year} wanted={len(wanted)} reason=feed_not_available."
            )
            continue
        records = []
        for item in data.get("vulnerabilities") or []:
            record = parse_nvd_record(item)
            if record["cve"] not in wanted:
                continue
            records.append(upload_record(record, scores_only=scores_only))

        matched = len(records)
        with_cvss = sum(1 for record in records if record["cvss_score"] is not None)
        uploaded = upload_records(supabase, records, batch_size=batch_size) if records else 0
        total_matched += matched
        total_uploaded += uploaded
        total_with_cvss += with_cvss
        log(
            "NVD findings-only year complete "
            f"year={year} wanted={len(wanted)} matched={matched} "
            f"uploaded={uploaded} with_cvss={with_cvss}."
        )

    log(
        "NVD findings-only sync complete "
        f"matched={total_matched} uploaded={total_uploaded} with_cvss={total_with_cvss}."
    )


def process_and_upload(*, max_pages=None, scores_only=False, batch_size=BATCH_SIZE):
    from supabase import create_client

    if batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0.")

    require_env()
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    start_index = 0
    total_uploaded = 0
    total_with_cvss = 0
    page_count = 0

    log(
        "Starting NVD sync "
        f"page_size={PAGE_SIZE} batch_size={batch_size} "
        f"scores_only={scores_only} api_key_configured={bool(NVD_API_KEY)} "
        f"max_pages={max_pages}."
    )

    while True:
        if max_pages is not None and page_count >= max_pages:
            log(f"Stopping early because --max-pages={max_pages} was reached.")
            break

        params = {"startIndex": start_index, "resultsPerPage": PAGE_SIZE}
        r = safe_request(params)
        data = r.json()
        vulns = data.get("vulnerabilities", [])

        if not vulns:
            break

        batch = []

        for v in vulns:
            try:
                record = parse_nvd_record(v)
                if not record["cve"]:
                    continue
                if record["cvss_score"] is not None:
                    total_with_cvss += 1
                batch.append(upload_record(record, scores_only=scores_only))

            except Exception:
                continue

            if len(batch) >= batch_size:
                total_uploaded += upload_batch(supabase, batch)
                batch = []

        if batch:
            total_uploaded += upload_batch(supabase, batch)

        page_count += 1
        log(
            "NVD page complete "
            f"page={page_count} startIndex={start_index} "
            f"records={len(vulns)} total_uploaded={total_uploaded} "
            f"total_with_cvss={total_with_cvss}."
        )
        start_index += PAGE_SIZE
        time.sleep(DELAY)

    log(f"NVD sync complete total_uploaded={total_uploaded} total_with_cvss={total_with_cvss}.")

def main():
    args = build_parser().parse_args()
    if args.smoke_test:
        smoke_test()
        return
    if args.findings_only:
        process_findings_only(
            scores_only=args.scores_only,
            batch_size=args.batch_size,
        )
        return
    process_and_upload(
        max_pages=args.max_pages,
        scores_only=args.scores_only,
        batch_size=args.batch_size,
    )

if __name__ == "__main__":
    main()

import os
import sys
import time
import argparse
from pathlib import Path

import requests
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
NVD_API_KEY = os.getenv("NVD_API_KEY")

BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
PAGE_SIZE = 2000
BATCH_SIZE = 500
DELAY = 2


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


def parse_nvd_record(v):
    cve_data = v.get("cve", {})
    cve_id = cve_data.get("id")

    descriptions = cve_data.get("descriptions") or []
    desc = None

    for d in descriptions:
        if d.get("lang") == "en" and d.get("value"):
            desc = d.get("value")
            break

    if desc is None and descriptions:
        desc = descriptions[0].get("value")

    metrics = cve_data.get("metrics", {})
    score = None
    severity = None
    metric_source = None

    if metrics.get("cvssMetricV31"):
        cvss = metrics["cvssMetricV31"][0]["cvssData"]
        score = cvss.get("baseScore")
        severity = cvss.get("baseSeverity")
        metric_source = "cvssMetricV31"
    elif metrics.get("cvssMetricV30"):
        cvss = metrics["cvssMetricV30"][0]["cvssData"]
        score = cvss.get("baseScore")
        severity = cvss.get("baseSeverity")
        metric_source = "cvssMetricV30"
    elif metrics.get("cvssMetricV2"):
        cvss = metrics["cvssMetricV2"][0]["cvssData"]
        score = cvss.get("baseScore")
        severity = metrics["cvssMetricV2"][0].get("baseSeverity")
        metric_source = "cvssMetricV2"

    return {
        "cve": cve_id,
        "cvss_score": score,
        "cvss_severity": severity,
        "description": desc,
        "_metric_source": metric_source,
    }


def upload_batch(supabase, batch):
    supabase.table("nvd").upsert(batch, on_conflict="cve").execute()
    return len(batch)


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
        f"score={record['cvss_score']} severity={record['cvss_severity']}."
    )
    if record["cvss_score"] is None:
        raise RuntimeError("NVD smoke test parsed a null CVSS score.")


def process_and_upload(*, max_pages=None):
    from supabase import create_client

    require_env()
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    start_index = 0
    total_uploaded = 0
    total_with_cvss = 0
    page_count = 0

    log(
        "Starting NVD sync "
        f"page_size={PAGE_SIZE} batch_size={BATCH_SIZE} "
        f"api_key_configured={bool(NVD_API_KEY)} max_pages={max_pages}."
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
                metric_source = record.pop("_metric_source")
                if not record["cve"]:
                    continue
                if record["cvss_score"] is not None:
                    total_with_cvss += 1
                batch.append(record)

            except Exception:
                continue

            if len(batch) >= BATCH_SIZE:
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
    process_and_upload(max_pages=args.max_pages)

if __name__ == "__main__":
    main()

import requests
import time
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
NVD_API_KEY = os.getenv("NVD_API_KEY")

BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
PAGE_SIZE = 2000
BATCH_SIZE = 500
DELAY = 2

def safe_request(params):
    headers = {"User-Agent": "vinces-nvd-script"}
    if NVD_API_KEY:
        headers["apiKey"] = NVD_API_KEY
    while True:
        try:
            r = requests.get(BASE_URL, params=params, headers=headers)
            if r.status_code == 429:
                time.sleep(30)
                continue
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException:
            time.sleep(10)

def upload_batch(supabase, batch):
    try:
        supabase.table("nvd").upsert(batch).execute()
    except Exception:
        pass

def process_and_upload():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    start_index = 0
    total_uploaded = 0
    while True:
        params = {"startIndex": start_index, "resultsPerPage": PAGE_SIZE}
        r = safe_request(params)
        data = r.json()
        vulns = data.get("vulnerabilities", [])
        if not vulns:
            break
        batch = []
        for v in vulns:
            try:
                cve_data = v["cve"]
                cve_id = cve_data["id"]
                metrics = cve_data.get("metrics", {})
                score = None
                severity = None
                if "cvssMetricV31" in metrics:
                    cvss = metrics["cvssMetricV31"][0]["cvssData"]
                    score = cvss.get("baseScore")
                    severity = cvss.get("baseSeverity")
                elif "cvssMetricV2" in metrics:
                    cvss = metrics["cvssMetricV2"][0]["cvssData"]
                    score = cvss.get("baseScore")
                    severity = metrics["cvssMetricV2"][0].get("baseSeverity")
                batch.append({
                    "cve": cve_id,
                    "cvss_score": score,
                    "cvss_severity": severity
                })
            except Exception:
                continue
            if len(batch) >= BATCH_SIZE:
                upload_batch(supabase, batch)
                total_uploaded += len(batch)
                batch = []
        if batch:
            upload_batch(supabase, batch)
            total_uploaded += len(batch)
        start_index += PAGE_SIZE
        time.sleep(DELAY)
    print(total_uploaded)

def main():
    process_and_upload()

if __name__ == "__main__":
    main()
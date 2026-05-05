import os
from pathlib import Path
import sys

import requests
from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

def fetch_kev():
    print("Fetching KEV...")

    r = requests.get(KEV_URL)
    r.raise_for_status()

    data = r.json()

    vulns = data["vulnerabilities"]

    print(f"Loaded {len(vulns)} KEV entries")

    return vulns

def transform_kev(vulns):
    records = []

    for v in vulns:
        records.append({
            "cve": v["cveID"],
            "date_added": v.get("dateAdded"),
            "due_date": v.get("dueDate"),
            "vendor_project": v.get("vendorProject"),
            "product": v.get("product"),
            "vulnerability_name": v.get("vulnerabilityName"),
            "short_description": v.get("shortDescription")
        })

    return records

def upload_to_supabase(records):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Uploading KEV...")

    supabase.table("kev").upsert(records).execute()

    print("Upload complete!")

def main():
    print("Starting KEV sync...")

    vulns = fetch_kev()
    records = transform_kev(vulns)

    # test first
    upload_to_supabase(records)

    print("KEV sync finished.")

if __name__ == "__main__":
    main()

import os
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import requests

# =========================
# pull_asset_data.py
# =========================
# Pull Host assets and related business context from Brinqa BQL
# and export them to CSV.
#
# Run:
# python3 backend/scripts/pull_asset_data.py

print("Starting asset + business context pull...")

# =========================
# CONFIG
# =========================
API_URL = "https://ucsc.brinqa.net/api/caasm/bql"
BASE_URL = "https://ucsc.brinqa.net"

LIMIT = 25

# output path
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_CSV = SCRIPT_DIR.parent / "data" / "asset_business_context.csv"

# paste token here without the "Bearer " prefix if you want to test locally
BRINQA_BEARER_TOKEN = ""

# fallback to env var if the field above is left blank
# export BRINQA_BEARER_TOKEN="your_token_here"
BEARER_TOKEN = BRINQA_BEARER_TOKEN.strip() or os.getenv("BRINQA_BEARER_TOKEN", "").strip()

if not BEARER_TOKEN:
    raise ValueError(
        "Set BRINQA_BEARER_TOKEN in the script or export BRINQA_BEARER_TOKEN before running."
    )

# BQL query
QUERY = '''
FIND Host AS h
THAT SUPPORTS >> BusinessService AS bs
AND bs THAT SUPPORTS >> BusinessUnit AS bu
AND h THAT IS >> AssetType AS at
'''.strip()

RETURNING_FIELDS = [
    "complianceStatus",
    "applications",
    "businessServices",
    "publicIpAddresses",
    "tags",
    "type",
    "environments",
    "privateIpAddresses",
    "uid",
    "displayName",
    "hostnames",
    "name",
    "model",
    "status",
    "id",
]

COOKIES = {
    "JSESSIONID": "321FF4D7ED2877EC95AD3EF70DF033CD",
}

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json;charset=UTF-8",
    "origin": BASE_URL,
    "priority": "u=1, i",
    "referer": f"{BASE_URL}/caasm/search?bql=FIND%20Host%20AS%20h%0ATHAT%20SUPPORTS%20%3E%3E%20BusinessService%20AS%20bs%0AAND%20bs%20THAT%20SUPPORTS%20%3E%3E%20BusinessUnit%20AS%20bu%0AAND%20h%20THAT%20IS%20%3E%3E%20AssetType%20AS%20at",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    "authorization": f"Bearer {BEARER_TOKEN}",
}


def build_payload(skip: int) -> Dict[str, Any]:
    return {
        "allowBqlUsingKeyword": True,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "returnDataModel": "Host",
        },
        "query": QUERY,
        "countOnly": None,
        "limit": LIMIT,
        "returningFields": RETURNING_FIELDS,
        "skip": skip,
        "orderBy": None,
        "filter": {},
        "text": None,
        "mainId": None,
        "format": "dataset",
        "source": "explorer",
        "relationshipQuery": None,
    }


def extract_records(data: Any) -> List[Dict[str, Any]]:
    if isinstance(data, dict):
        return data.get("results") or data.get("items") or data.get("data") or []
    if isinstance(data, list):
        return data
    return []


def flatten_value(value: Any) -> Any:
    if isinstance(value, list):
        flattened_parts = []
        for item in value:
            if isinstance(item, dict):
                flattened_parts.append(
                    str(
                        item.get("displayName")
                        or item.get("name")
                        or item.get("title")
                        or item.get("id")
                        or item
                    )
                )
            else:
                flattened_parts.append(str(item))
        return " | ".join(flattened_parts)

    if isinstance(value, dict):
        return (
            value.get("displayName")
            or value.get("name")
            or value.get("title")
            or value.get("id")
            or str(value)
        )

    return value


def normalize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    return {key: flatten_value(value) for key, value in record.items()}


def fetch_page(session: requests.Session, skip: int) -> List[Dict[str, Any]]:
    payload = build_payload(skip)
    response = session.post(API_URL, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    return extract_records(data)


def fetch_all_assets() -> List[Dict[str, Any]]:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.cookies.update(COOKIES)

    all_records: List[Dict[str, Any]] = []
    skip = 0

    while True:
        print(f"Fetching page with skip={skip}, limit={LIMIT} ...")
        page_records = fetch_page(session, skip=skip)

        if not page_records:
            print("No more records found.")
            break

        normalized_page = [normalize_record(r) for r in page_records]
        all_records.extend(normalized_page)

        print(f"Fetched {len(page_records)} records. Running total: {len(all_records)}")

        if len(page_records) < LIMIT:
            break

        skip += LIMIT

    return all_records


def main() -> None:
    records = fetch_all_assets()

    if not records:
        print("No assets found for this query.")
        return

    df = pd.DataFrame(records)

    # drop exact duplicate rows if any
    df = df.drop_duplicates()

    # if host_id exists, prefer deduping by host_id
    if "host_id" in df.columns:
        df = df.drop_duplicates(subset=["host_id"])

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False)

    print(f"Saved {len(df)} unique asset rows to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()

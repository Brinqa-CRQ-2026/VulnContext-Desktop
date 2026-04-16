import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import requests

BASE_URL = "https://ucsc.brinqa.net"
RELATED_API_URL = f"{BASE_URL}/api/caasm/bql/related"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

BEARER_TOKEN = os.getenv("BRINQA_BEARER_TOKEN", "").strip()

if not BEARER_TOKEN:
    raise ValueError(
        "Export BRINQA_BEARER_TOKEN before running Brinqa scripts."
    )

SESSION_COOKIE = os.getenv("BRINQA_JSESSIONID", "").strip()

RELATED_QUERY = "Find SourceModel as s THAT SOURCED_FROM << Host"


def build_headers(asset_id: str) -> Dict[str, str]:
    return {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": f"Bearer {BEARER_TOKEN}",
        "content-type": "application/json;charset=UTF-8",
        "origin": BASE_URL,
        "priority": "u=1, i",
        "referer": f"{BASE_URL}/caasm/hosts/{asset_id}",
        "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
    }


def build_related_payload(asset_id: str) -> Dict[str, Any]:
    return {
        "allowBqlUsingKeyword": None,
        "callingContext": None,
        "query": RELATED_QUERY,
        "countOnly": None,
        "limit": None,
        "returningFields": [
            "uid",
            "dataModelTitle",
            "sourceIcon",
            "dataIntegrationTitle",
        ],
        "skip": None,
        "orderBy": None,
        "filter": None,
        "text": None,
        "mainId": asset_id,
        "format": "dataset",
        "source": None,
        "relationshipQuery": RELATED_QUERY,
    }


def flatten_value(value: Any) -> Any:
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict):
                parts.append(
                    str(
                        item.get("displayName")
                        or item.get("name")
                        or item.get("title")
                        or item.get("id")
                        or item
                    )
                )
            else:
                parts.append(str(item))
        return " | ".join(parts)

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


def create_session() -> requests.Session:
    session = requests.Session()
    if SESSION_COOKIE:
        session.cookies.update({"JSESSIONID": SESSION_COOKIE})
    return session


def fetch_related_source(
    session: requests.Session,
    asset_id: str,
    *,
    resource_name: str,
    integration_name: str,
    model_name: str,
) -> Optional[Dict[str, Any]]:
    payload = build_related_payload(asset_id)
    headers = build_headers(asset_id)

    try:
        response = session.post(RELATED_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"Skipping asset_id={asset_id}: related-source lookup failed: {exc}")
        return None

    data = response.json()
    if not isinstance(data, dict):
        print(f"Skipping asset_id={asset_id}: related-source lookup returned unexpected payload")
        return None

    rows = data.get("data") or []
    if not isinstance(rows, list) or not rows:
        print(f"Skipping asset_id={asset_id}: no related source models found")
        return None

    target_model = model_name.lower()
    target_resource = resource_name.lower()
    target_integration = integration_name.lower()

    for row in rows:
        if not isinstance(row, dict):
            continue

        metadata = row.get("$metadata") or {}
        row_model = str(metadata.get("dataModelName") or row.get("dataModelTitle") or "").lower()
        row_resource = str(metadata.get("resource") or "").lower()
        row_integration = str(row.get("dataIntegrationTitle") or "").lower()

        if (
            target_model in row_model
            or row_resource == target_resource
            or row_integration == target_integration
        ):
            return {
                "source_id": str(row.get("id") or "").strip(),
                "source_uid": flatten_value(row.get("uid")),
                "source_model": flatten_value(row.get("dataModelTitle")),
                "source_integration": flatten_value(row.get("dataIntegrationTitle")),
                "source_link": flatten_value(metadata.get("link")),
            }

    print(f"Skipping asset_id={asset_id}: no matching related source found for {model_name}")
    return None


def save_records_to_csv(records: List[Dict[str, Any]], output_path: Path) -> None:
    if not records:
        print(f"No records to save for {output_path}")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(records).drop_duplicates().to_csv(output_path, index=False)

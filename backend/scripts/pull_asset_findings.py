import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from brinqa_source_helpers import BASE_URL, DATA_DIR, build_headers, create_session, save_records_to_csv

# =========================
# pull_asset_findings.py
# =========================
# Pull lean Vulnerability rows for a single Host asset id.
#
# Run:
# python3 backend/scripts/pull_asset_findings.py --asset-id 1891896448114794549

API_URL = f"{BASE_URL}/api/caasm/bql"
OUTPUT_CSV = DATA_DIR / "asset_findings.csv"
DEFAULT_PAGE_SIZE = 100

RETURNING_FIELDS = [
    "id",
    "uid",
    "displayName",
    "status",
    "riskScore",
    "baseRiskScore",
    "firstFound",
    "lastFound",
    "ageInDays",
    "type",
    "type.cveIds",
    "type.cweIds",
    "dateCreated",
    "lastUpdated",
]

THIN_COLUMNS = [
    "asset_id",
    "finding_id",
    "finding_uid",
    "finding_name",
    "status",
    "cve_id",
    "cwe_id",
    "brinqa_base_risk_score",
    "brinqa_risk_score",
    "first_found",
    "last_found",
    "age_in_days",
    "date_created",
    "last_updated",
]


def build_query(asset_id: str) -> str:
    return (
        'FIND Vulnerability AS v WHERE v.__appName__ = "caasm" '
        f"THAT HAS Host AS h WHERE h.id = {asset_id} WITH DISTINCT v"
    )


def build_payload(asset_id: str, *, limit: int, skip: int, refresh: bool) -> Dict[str, Any]:
    return {
        "allowBqlUsingKeyword": None,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextName": "vulnerabilityDefaultList",
            "viewType": "LIST",
            "rootDataModel": "Vulnerability",
            "returnDataModel": "Vulnerability",
        },
        "query": build_query(asset_id),
        "countOnly": None,
        "limit": limit,
        "returningFields": RETURNING_FIELDS,
        "skip": skip,
        "orderBy": None,
        "filter": None,
        "text": None,
        "mainId": None,
        "format": "dataset",
        "source": None,
        "relationshipQuery": None,
        "refresh": refresh,
    }


def _extract_records(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("results", "items", "data"):
            rows = payload.get(key)
            if isinstance(rows, list):
                return [row for row in rows if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def _stringify_list(values: Any, *, preferred_keys: Optional[List[str]] = None) -> Optional[str]:
    if not isinstance(values, list):
        return None

    parts: List[str] = []
    for item in values:
        if isinstance(item, dict):
            text = None
            for key in preferred_keys or []:
                candidate = item.get(key)
                if candidate is not None and str(candidate).strip():
                    text = str(candidate).strip()
                    break
            if text is None:
                text = str(item)
            parts.append(text)
        elif item is not None and str(item).strip():
            parts.append(str(item).strip())

    if not parts:
        return None
    return " | ".join(parts)


def _normalize_type_block(type_value: Any) -> Dict[str, Optional[str]]:
    if not isinstance(type_value, dict):
        return {
            "type_id": None,
            "type_display_name": None,
            "cve_ids": None,
            "cwe_ids": None,
            "cve_record_names": None,
        }

    cve_records = type_value.get("cveRecords")
    cve_record_names = None
    if isinstance(cve_records, list):
        cve_record_names = _stringify_list(
            cve_records,
            preferred_keys=["displayName", "name", "title", "id"],
        )

    return {
        "type_id": str(type_value.get("id")).strip() if type_value.get("id") is not None else None,
        "type_display_name": (
            str(
                type_value.get("displayName")
                or type_value.get("name")
                or type_value.get("title")
            ).strip()
            if (
                type_value.get("displayName") is not None
                or type_value.get("name") is not None
                or type_value.get("title") is not None
            )
            else None
        ),
        "cve_ids": _stringify_list(type_value.get("cveIds")),
        "cwe_ids": _stringify_list(type_value.get("cweIds")),
        "cve_record_names": cve_record_names,
    }


def _first_token(value: Any) -> Optional[str]:
    text = _stringify_list(value) if isinstance(value, list) else value
    if text is None:
        return None
    normalized = str(text).replace("|", ",").replace(";", ",")
    for part in normalized.split(","):
        cleaned = part.strip()
        if cleaned:
            return cleaned
    return None


def _is_nonzero_number(value: Any) -> bool:
    if value is None:
        return False
    try:
        return float(value) != 0.0
    except (TypeError, ValueError):
        return False


def _has_cve_ids(value: Any) -> bool:
    return value is not None and bool(str(value).strip())


def normalize_finding(record: Dict[str, Any], asset_id: str) -> Dict[str, Any]:
    type_value = record.get("type")
    type_block = _normalize_type_block(type_value)

    return {
        "asset_id": asset_id,
        "finding_id": record.get("id"),
        "finding_uid": record.get("uid"),
        "finding_name": record.get("displayName"),
        "status": record.get("status"),
        "cve_id": _first_token(type_value.get("cveIds")) if isinstance(type_value, dict) else None,
        "cwe_id": _first_token(type_value.get("cweIds")) if isinstance(type_value, dict) else None,
        "brinqa_risk_score": record.get("riskScore"),
        "brinqa_base_risk_score": record.get("baseRiskScore"),
        "first_found": record.get("firstFound"),
        "last_found": record.get("lastFound"),
        "age_in_days": record.get("ageInDays"),
        "date_created": record.get("dateCreated"),
        "last_updated": record.get("lastUpdated"),
    }


def fetch_asset_findings(
    asset_id: str,
    *,
    page_size: int = DEFAULT_PAGE_SIZE,
    refresh: bool = True,
    session: Optional[requests.Session] = None,
) -> List[Dict[str, Any]]:
    own_session = session is None
    session = session or create_session()
    findings: List[Dict[str, Any]] = []
    skip = 0

    try:
        while True:
            print(f"Fetching findings for asset_id={asset_id} with skip={skip}, limit={page_size}...")
            response = session.post(
                API_URL,
                headers=build_headers(asset_id),
                json=build_payload(asset_id, limit=page_size, skip=skip, refresh=refresh),
                timeout=60,
            )
            response.raise_for_status()

            rows = _extract_records(response.json())
            if not rows:
                break

            for row in rows:
                normalized = normalize_finding(row, asset_id)
                if not _is_nonzero_number(normalized.get("brinqa_base_risk_score")):
                    continue
                if not _has_cve_ids(normalized.get("cve_id")):
                    continue
                findings.append(normalized)

            if len(rows) < page_size:
                break

            skip += page_size
    finally:
        if own_session:
            session.close()

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pull lean vulnerability rows for a single Host asset id."
    )
    parser.add_argument(
        "--asset-id",
        required=True,
        help="Host asset id to query, for example 1891896448114794549",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"Results to request per page. Default: {DEFAULT_PAGE_SIZE}",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_CSV),
        help=f"Output CSV path. Default: {OUTPUT_CSV}",
    )
    parser.add_argument(
        "--no-refresh",
        action="store_true",
        help="Do not request a backend refresh before returning cached list results.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asset_id = args.asset_id.strip()
    page_size = max(1, args.page_size)

    print("Starting asset findings pull...")
    records = fetch_asset_findings(
        asset_id,
        page_size=page_size,
        refresh=not args.no_refresh,
    )

    if not records:
        print(f"No vulnerability rows were returned for asset_id={asset_id}.")
        return

    output_path = Path(args.output)
    save_records_to_csv(records, output_path)
    print(f"Saved {len(records)} finding rows to {output_path}")
    print("Columns: " + ", ".join(THIN_COLUMNS))


if __name__ == "__main__":
    main()

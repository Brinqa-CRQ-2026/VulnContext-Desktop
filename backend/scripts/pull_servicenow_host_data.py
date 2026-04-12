import argparse
from pathlib import Path
from typing import Any, Dict, Optional

import requests

from brinqa_source_helpers import (
    BASE_URL,
    DATA_DIR,
    build_headers,
    create_session,
    fetch_related_source,
    normalize_record,
    save_records_to_csv,
)

# =========================
# pull_servicenow_host_data.py
# =========================
# Pull lean ServiceNow Host lookup + detail data for a single Host asset id.
#
# Run:
# python3 backend/scripts/pull_servicenow_host_data.py --asset-id 1891896448106405968

SERVICENOW_DETAIL_API_URL_TEMPLATE = (
    f"{BASE_URL}/api/caasm/model/servicenowHosts/{{servicenow_id}}/"
)
OUTPUT_CSV = DATA_DIR / "servicenow_host_lookup_and_detail.csv"

FIELDS = [
    "uid",
    "application",
    "businessservice",
    "category",
    "complianceflags",
    "devicetype",
    "division",
    "itSme",
    "itdirector",
    "internalorexternal",
    "location",
    "owner",
    "pci",
    "pii",
    "serviceteam",
    "uuid",
    "virtualorphysical",
]


def build_servicenow_detail_payload(servicenow_id: str) -> Dict[str, Any]:
    return {
        "fields": FIELDS,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextObjectId": servicenow_id,
        },
    }


def build_output_record(
    asset_id: str, servicenow_source: Dict[str, Any], detail: Dict[str, Any]
) -> Dict[str, Any]:
    return {
        "asset_id": asset_id,
        "servicenow_host_id": servicenow_source.get("source_id"),
        "servicenow_host_uid": servicenow_source.get("source_uid"),
        "servicenow_host_link": servicenow_source.get("source_link"),
        "servicenow_host_integration": servicenow_source.get("source_integration"),
        "application": detail.get("application"),
        "businessservice": detail.get("businessservice"),
        "category": detail.get("category"),
        "complianceflags": detail.get("complianceflags"),
        "devicetype": detail.get("devicetype"),
        "division": detail.get("division"),
        "itSme": detail.get("itSme"),
        "itdirector": detail.get("itdirector"),
        "internalorexternal": detail.get("internalorexternal"),
        "location": detail.get("location"),
        "owner": detail.get("owner"),
        "pci": detail.get("pci"),
        "pii": detail.get("pii"),
        "serviceteam": detail.get("serviceteam"),
        "uuid": detail.get("uuid"),
        "virtualorphysical": detail.get("virtualorphysical"),
    }


def fetch_servicenow_host_for_asset(
    asset_id: str, session: Optional[requests.Session] = None
) -> Optional[Dict[str, Any]]:
    own_session = session is None
    session = session or create_session()

    try:
        servicenow_source = fetch_related_source(
            session,
            asset_id,
            resource_name="servicenowhosts",
            integration_name="servicenow",
            model_name="ServicenowHost",
        )
        if servicenow_source is None:
            return None

        servicenow_id = servicenow_source["source_id"]
        if not servicenow_id:
            print(f"Skipping asset_id={asset_id}: resolved ServiceNow relation has no id")
            return None

        response = session.post(
            SERVICENOW_DETAIL_API_URL_TEMPLATE.format(servicenow_id=servicenow_id),
            headers=build_headers(asset_id),
            json=build_servicenow_detail_payload(servicenow_id),
            timeout=60,
        )
        response.raise_for_status()

        data = response.json()
        if not isinstance(data, dict) or not data:
            print(f"Skipping asset_id={asset_id}: empty or unexpected ServiceNow detail payload")
            return None

        normalized = normalize_record(data)
        return build_output_record(asset_id, servicenow_source, normalized)
    except requests.RequestException as exc:
        print(
            f"Skipping asset_id={asset_id}: ServiceNow detail fetch failed: {exc}"
        )
        return None
    finally:
        if own_session:
            session.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resolve ServiceNow host id from a Host asset id and pull lean detail data."
    )
    parser.add_argument(
        "--asset-id",
        required=True,
        help="Host asset id to test, for example 1891896448106405968",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_CSV),
        help=f"Output CSV path. Default: {OUTPUT_CSV}",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print("Starting ServiceNow host detail pull...")

    record = fetch_servicenow_host_for_asset(args.asset_id.strip())
    if record is None:
        print("No ServiceNow host details were returned.")
        return

    output_path = Path(args.output)
    save_records_to_csv([record], output_path)
    print(f"Saved 1 ServiceNow host detail row to {output_path}")


if __name__ == "__main__":
    main()

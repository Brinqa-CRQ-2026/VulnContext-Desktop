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
# pull_qualys_vm_host_data.py
# =========================
# Pull lean Qualys VM Host lookup + detail data for a single Host asset id.
#
# Run:
# python3 backend/scripts/pull_qualys_vm_host_data.py --asset-id 1891896448106405968

QUALYS_DETAIL_API_URL_TEMPLATE = f"{BASE_URL}/api/caasm/model/qualysVmHosts/{{qualys_id}}/"
OUTPUT_CSV = DATA_DIR / "qualys_vm_host_lookup_and_detail.csv"

FIELDS = [
    "uid",
    "dnsname",
    "hostnameIdentifier",
    "lastauthenticatedscan",
    "lastscanned",
    "macAddressesIdentifier",
    "trackingmethod",
    "uuid",
]


def build_qualys_detail_payload(qualys_id: str) -> Dict[str, Any]:
    return {
        "fields": FIELDS,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextObjectId": qualys_id,
        },
    }


def build_output_record(
    asset_id: str, qualys_source: Dict[str, Any], detail: Dict[str, Any]
) -> Dict[str, Any]:
    return {
        "asset_id": asset_id,
        "qualys_vm_host_id": qualys_source.get("source_id"),
        "qualys_vm_host_uid": qualys_source.get("source_uid"),
        "qualys_vm_host_link": qualys_source.get("source_link"),
        "qualys_vm_host_integration": qualys_source.get("source_integration"),
        "dnsname": detail.get("dnsname"),
        "hostnameIdentifier": detail.get("hostnameIdentifier"),
        "trackingmethod": detail.get("trackingmethod"),
        "uuid": detail.get("uuid"),
        "macAddressesIdentifier": detail.get("macAddressesIdentifier"),
        "lastauthenticatedscan": detail.get("lastauthenticatedscan"),
        "lastscanned": detail.get("lastscanned"),
    }


def fetch_qualys_vm_host_for_asset(
    asset_id: str, session: Optional[requests.Session] = None
) -> Optional[Dict[str, Any]]:
    own_session = session is None
    session = session or create_session()

    try:
        qualys_source = fetch_related_source(
            session,
            asset_id,
            resource_name="qualysvmhosts",
            integration_name="qualys vm",
            model_name="QualysVmHost",
        )
        if qualys_source is None:
            return None

        qualys_id = qualys_source["source_id"]
        if not qualys_id:
            print(f"Skipping asset_id={asset_id}: resolved Qualys relation has no id")
            return None

        response = session.post(
            QUALYS_DETAIL_API_URL_TEMPLATE.format(qualys_id=qualys_id),
            headers=build_headers(asset_id),
            json=build_qualys_detail_payload(qualys_id),
            timeout=60,
        )
        response.raise_for_status()

        data = response.json()
        if not isinstance(data, dict) or not data:
            print(f"Skipping asset_id={asset_id}: empty or unexpected Qualys detail payload")
            return None

        normalized = normalize_record(data)
        return build_output_record(asset_id, qualys_source, normalized)
    except requests.RequestException as exc:
        print(
            f"Skipping asset_id={asset_id}: Qualys detail fetch failed: {exc}"
        )
        return None
    finally:
        if own_session:
            session.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resolve Qualys VM host id from a Host asset id and pull lean detail data."
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
    print("Starting Qualys VM host detail pull...")

    record = fetch_qualys_vm_host_for_asset(args.asset_id.strip())
    if record is None:
        print("No Qualys VM host details were returned.")
        return

    output_path = Path(args.output)
    save_records_to_csv([record], output_path)
    print(f"Saved 1 Qualys VM host detail row to {output_path}")


if __name__ == "__main__":
    main()

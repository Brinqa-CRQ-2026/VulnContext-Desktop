import argparse
from pathlib import Path
from typing import Dict, List

from brinqa_source_helpers import DATA_DIR, create_session, save_records_to_csv
from pull_qualys_vm_host_data import fetch_qualys_vm_host_for_asset
from pull_servicenow_host_data import fetch_servicenow_host_for_asset

# =========================
# pull_asset_source_data.py
# =========================
# Pull Qualys and ServiceNow enrichment data for a single Host asset id.
#
# Run:
# python3 backend/scripts/pull_asset_source_data.py --asset-id 1891896448106405968

QUALYS_OUTPUT_CSV = DATA_DIR / "qualys_vm_host_lookup_and_detail.csv"
SERVICENOW_OUTPUT_CSV = DATA_DIR / "servicenow_host_lookup_and_detail.csv"
COMBINED_OUTPUT_CSV = DATA_DIR / "asset_source_lookup_and_detail.csv"


def build_combined_record(asset_id: str, qualys: Dict[str, str], servicenow: Dict[str, str]) -> Dict[str, str]:
    combined: Dict[str, str] = {"asset_id": asset_id}

    if qualys:
        for key, value in qualys.items():
            if key != "asset_id":
                combined[key] = value

    if servicenow:
        for key, value in servicenow.items():
            if key != "asset_id":
                combined[key] = value

    return combined


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pull Qualys and ServiceNow enrichment data for one Host asset id."
    )
    parser.add_argument(
        "--asset-id",
        required=True,
        help="Host asset id to test, for example 1891896448106405968",
    )
    parser.add_argument(
        "--combined-output",
        default=str(COMBINED_OUTPUT_CSV),
        help=f"Combined output CSV path. Default: {COMBINED_OUTPUT_CSV}",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asset_id = args.asset_id.strip()

    print("Starting combined asset source detail pull...")
    session = create_session()

    try:
        qualys_record = fetch_qualys_vm_host_for_asset(asset_id, session=session)
        servicenow_record = fetch_servicenow_host_for_asset(asset_id, session=session)
    finally:
        session.close()

    if qualys_record is not None:
        save_records_to_csv([qualys_record], QUALYS_OUTPUT_CSV)
        print(f"Saved 1 Qualys VM host detail row to {QUALYS_OUTPUT_CSV}")
    else:
        print("No Qualys VM host details were returned.")

    if servicenow_record is not None:
        save_records_to_csv([servicenow_record], SERVICENOW_OUTPUT_CSV)
        print(f"Saved 1 ServiceNow host detail row to {SERVICENOW_OUTPUT_CSV}")
    else:
        print("No ServiceNow host details were returned.")

    combined_records: List[Dict[str, str]] = []
    if qualys_record is not None or servicenow_record is not None:
        combined_records.append(
            build_combined_record(asset_id, qualys_record or {}, servicenow_record or {})
        )

    if not combined_records:
        print("No source enrichment details were returned.")
        return

    combined_output_path = Path(args.combined_output)
    save_records_to_csv(combined_records, combined_output_path)
    print(f"Saved 1 combined source detail row to {combined_output_path}")


if __name__ == "__main__":
    main()

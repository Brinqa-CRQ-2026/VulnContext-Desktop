import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.brinqa_source_helpers import DATA_DIR
from scripts.manual.pull_asset_findings import DEFAULT_PAGE_SIZE, THIN_COLUMNS, fetch_asset_findings

ASSET_CONTEXT_CSV = DATA_DIR / "asset_business_context.csv"
OUTPUT_CSV = DATA_DIR / "findings_for_supabase.csv"

FINAL_COLUMNS = [
    "asset_id",
    "finding_id",
    "finding_uid",
    "finding_name",
    "status",
    "cve_id",
    "brinqa_base_risk_score",
    "brinqa_risk_score",
    "first_found",
    "last_found",
    "age_in_days",
    "date_created",
    "last_updated",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export thin Supabase-ready finding rows for all assets in asset context CSV."
    )
    parser.add_argument(
        "--asset-context-csv",
        default=str(ASSET_CONTEXT_CSV),
        help=f"Base asset business context CSV path. Default: {ASSET_CONTEXT_CSV}",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_CSV),
        help=f"Output CSV path. Default: {OUTPUT_CSV}",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"Results to request per page. Default: {DEFAULT_PAGE_SIZE}",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of concurrent asset-finding workers to run. Default: 4",
    )
    parser.add_argument(
        "--no-refresh",
        action="store_true",
        help="Do not request a backend refresh before returning cached list results.",
    )
    return parser.parse_args()


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _read_asset_context(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Asset context CSV not found: {path}")
    return pd.read_csv(path, dtype=str).fillna("")


def _canonical_asset_name(row: Dict[str, Any]) -> str | None:
    for key in ("hostnames", "displayName", "name"):
        value = _clean(row.get(key))
        if value:
            return value
    return None


def _load_assets(df: pd.DataFrame) -> List[Tuple[int, str, str | None]]:
    assets: List[Tuple[int, str, str | None]] = []
    for idx, row in enumerate(df.to_dict("records"), start=1):
        asset_id = _clean(row.get("asset_id") or row.get("id"))
        if asset_id is None:
            continue
        assets.append((idx, asset_id, _canonical_asset_name(row)))
    return assets


def _fetch_findings_for_asset(
    task: Tuple[int, int, str, str | None, int, bool]
) -> Tuple[int, List[Dict[str, Any]]]:
    idx, total_assets, asset_id, asset_name, page_size, refresh = task
    print(f"[{idx}/{total_assets}] Pulling findings for asset_id={asset_id}")

    try:
        findings = fetch_asset_findings(
            asset_id,
            page_size=page_size,
            refresh=refresh,
        )
    except requests.RequestException as exc:
        print(f"Skipping asset_id={asset_id}: finding pull failed: {exc}")
        return idx, []

    return idx, findings


def _fetch_all_findings(
    assets: List[Tuple[int, str, str | None]],
    *,
    page_size: int,
    workers: int,
    refresh: bool,
) -> pd.DataFrame:
    if not assets:
        return pd.DataFrame(columns=FINAL_COLUMNS)

    total_assets = len(assets)
    max_workers = min(max(1, workers), total_assets)
    tasks = [
        (idx, total_assets, asset_id, asset_name, page_size, refresh)
        for idx, asset_id, asset_name in assets
    ]
    rows_by_index: Dict[int, List[Dict[str, Any]]] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_fetch_findings_for_asset, task) for task in tasks]
        for future in as_completed(futures):
            idx, rows = future.result()
            rows_by_index[idx] = rows

    ordered_rows: List[Dict[str, Any]] = []
    for idx in sorted(rows_by_index):
        ordered_rows.extend(rows_by_index[idx])

    if not ordered_rows:
        return pd.DataFrame(columns=FINAL_COLUMNS)

    final_df = pd.DataFrame(ordered_rows)
    for column in FINAL_COLUMNS:
        if column not in final_df.columns:
            final_df[column] = None
    return final_df[FINAL_COLUMNS].copy()


def main() -> None:
    args = parse_args()
    asset_context_path = Path(args.asset_context_csv)
    output_path = Path(args.output)
    page_size = max(1, args.page_size)
    workers = max(1, args.workers)

    base_df = _read_asset_context(asset_context_path).rename(columns={"id": "asset_id"})
    assets = _load_assets(base_df)
    if not assets:
        print("No asset ids found in the base asset business context CSV.")
        return

    final_df = _fetch_all_findings(
        assets,
        page_size=page_size,
        workers=workers,
        refresh=not args.no_refresh,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(output_path, index=False)

    print(f"Wrote {len(final_df)} finding rows to {output_path}")
    print(f"Used {min(workers, len(assets))} worker(s) across {len(assets)} asset(s)")
    print("Columns: " + ", ".join(FINAL_COLUMNS))


if __name__ == "__main__":
    main()

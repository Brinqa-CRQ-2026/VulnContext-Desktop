import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.brinqa_source_helpers import (
    BASE_URL,
    DATA_DIR,
    build_headers,
    create_session,
    fetch_related_source,
    normalize_record,
)

ASSET_CONTEXT_CSV = DATA_DIR / "asset_business_context.csv"
DETAIL_OUTPUT_CSV = DATA_DIR / "assets_source_detail.csv"
OUTPUT_CSV = DATA_DIR / "assets_for_supabase.csv"

QUALYS_DETAIL_API_URL_TEMPLATE = f"{BASE_URL}/api/caasm/model/qualysVmHosts/{{qualys_id}}/"
SERVICENOW_DETAIL_API_URL_TEMPLATE = f"{BASE_URL}/api/caasm/model/servicenowHosts/{{servicenow_id}}/"

SOURCE_DETAIL_COLUMNS = [
    "asset_id",
    "uid",
    "hostname",
    "dnsname",
    "uuid",
    "tracking_method",
    "application",
    "business_service",
    "owner",
    "service_team",
    "division",
    "it_sme",
    "it_director",
    "location",
    "internal_or_external",
    "device_type",
    "category",
    "virtual_or_physical",
    "status",
    "compliance_status",
    "compliance_flags",
    "pci",
    "pii",
    "asset_criticality",
    "public_ip_addresses",
    "private_ip_addresses",
    "last_authenticated_scan",
    "last_scanned",
    "qualys_vm_host_id",
    "qualys_vm_host_uid",
    "qualys_vm_host_link",
    "qualys_vm_host_integration",
    "servicenow_host_id",
    "servicenow_host_uid",
    "servicenow_host_link",
    "servicenow_host_integration",
]

FINAL_COLUMNS = [
    "asset_id",
    "hostname",
    "application",
    "business_service",
    "internal_or_external",
    "public_ip_addresses",
    "device_type",
    "category",
    "status",
    "compliance_flags",
    "pci",
    "pii",
    "tags",
    "environment",
    "qualys_vm_host_id",
    "qualys_vm_host_uid",
    "qualys_vm_host_link",
    "qualys_vm_host_integration",
    "servicenow_host_id",
    "servicenow_host_uid",
    "servicenow_host_link",
    "servicenow_host_integration",
]

QUALYS_FIELDS = [
    "uid",
    "dnsname",
    "hostnameIdentifier",
    "lastauthenticatedscan",
    "lastscanned",
    "macAddressesIdentifier",
    "trackingmethod",
    "uuid",
]

SERVICENOW_FIELDS = [
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

ENVIRONMENT_TAGS = {"development", "production", "test"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export source detail and final Supabase-ready assets CSVs from Brinqa host context."
    )
    parser.add_argument(
        "--asset-context-csv",
        default=str(ASSET_CONTEXT_CSV),
        help=f"Base asset business context CSV path. Default: {ASSET_CONTEXT_CSV}",
    )
    parser.add_argument(
        "--detail-output",
        default=str(DETAIL_OUTPUT_CSV),
        help=f"Local source-detail snapshot path. Default: {DETAIL_OUTPUT_CSV}",
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_CSV),
        help=f"Final merged asset CSV path. Default: {OUTPUT_CSV}",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of concurrent asset-enrichment workers to run. Default: 4",
    )
    return parser.parse_args()


def _clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _to_bool_string(value: Any) -> Optional[str]:
    cleaned = _clean(value)
    if cleaned is None:
        return None
    lowered = cleaned.lower()
    if lowered in {"true", "1", "yes", "y"}:
        return "true"
    if lowered in {"false", "0", "no", "n"}:
        return "false"
    return None


def _canonical_hostname(row: Dict[str, Any]) -> Optional[str]:
    for key in ("hostnameIdentifier", "dnsname", "hostnames", "displayName", "name"):
        value = _clean(row.get(key))
        if value:
            return value
    return None


def _normalize_tags(value: Any) -> list[str]:
    cleaned = _clean(value)
    if not cleaned:
        return []

    tags: list[str] = []
    for part in cleaned.split("|"):
        token = part.strip()
        if token and token not in tags:
            tags.append(token)
    return tags


def _tag_array_literal(tags: list[str]) -> Optional[str]:
    if not tags:
        return None
    escaped = [tag.replace("\\", "\\\\").replace('"', '\\"') for tag in tags]
    return "{" + ",".join(f'"{tag}"' for tag in escaped) + "}"


def _normalize_environment(value: Any) -> Optional[str]:
    cleaned = _clean(value)
    if not cleaned:
        return None

    lowered = cleaned.lower()
    if lowered.startswith("development"):
        return "development"
    if lowered.startswith("production"):
        return "production"
    if lowered.startswith("test"):
        return "test"
    if lowered == "unknown":
        return "unknown"
    return lowered


def _derive_environment(tags: list[str], environments_value: Any) -> str:
    for tag in tags:
        lowered = tag.lower()
        if lowered in ENVIRONMENT_TAGS:
            return lowered

    return _normalize_environment(environments_value) or "unknown"


def _read_asset_context(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Asset context CSV not found: {path}")
    return pd.read_csv(path, dtype=str).fillna("")


def _load_asset_ids(df: pd.DataFrame) -> List[str]:
    id_column = "asset_id" if "asset_id" in df.columns else "id"
    asset_ids = []
    for value in df[id_column].tolist():
        cleaned = _clean(value)
        if cleaned:
            asset_ids.append(cleaned)
    return asset_ids


def _build_detail_payload(object_id: str, fields: List[str]) -> Dict[str, Any]:
    return {
        "fields": fields,
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextObjectId": object_id,
        },
    }


def _fetch_qualys_for_asset(asset_id: str, session: requests.Session) -> Optional[Dict[str, Any]]:
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
        json=_build_detail_payload(qualys_id, QUALYS_FIELDS),
        timeout=60,
    )
    response.raise_for_status()

    data = response.json()
    if not isinstance(data, dict) or not data:
        print(f"Skipping asset_id={asset_id}: empty or unexpected Qualys detail payload")
        return None

    detail = normalize_record(data)
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
        "lastauthenticatedscan": detail.get("lastauthenticatedscan"),
        "lastscanned": detail.get("lastscanned"),
    }


def _fetch_servicenow_for_asset(
    asset_id: str,
    session: requests.Session,
) -> Optional[Dict[str, Any]]:
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
        json=_build_detail_payload(servicenow_id, SERVICENOW_FIELDS),
        timeout=60,
    )
    response.raise_for_status()

    data = response.json()
    if not isinstance(data, dict) or not data:
        print(f"Skipping asset_id={asset_id}: empty or unexpected ServiceNow detail payload")
        return None

    detail = normalize_record(data)
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


def _fetch_source_detail_for_asset(task: Tuple[int, int, str]) -> Tuple[int, Dict[str, Any]]:
    idx, total_assets, asset_id = task
    print(f"[{idx}/{total_assets}] Pulling source detail for asset_id={asset_id}")
    merged: Dict[str, Any] = {"asset_id": asset_id}

    session = create_session()
    try:
        try:
            qualys_row = _fetch_qualys_for_asset(asset_id, session)
        except requests.RequestException as exc:
            print(f"Skipping asset_id={asset_id}: Qualys detail fetch failed: {exc}")
            qualys_row = None

        try:
            servicenow_row = _fetch_servicenow_for_asset(asset_id, session)
        except requests.RequestException as exc:
            print(f"Skipping asset_id={asset_id}: ServiceNow detail fetch failed: {exc}")
            servicenow_row = None
    finally:
        session.close()

    for record in (qualys_row or {}, servicenow_row or {}):
        for key, value in record.items():
            if key == "asset_id":
                continue
            merged[key] = value

    return idx, merged


def _fetch_all_source_detail(asset_ids: List[str], *, workers: int) -> pd.DataFrame:
    if not asset_ids:
        return pd.DataFrame()

    total_assets = len(asset_ids)
    max_workers = min(max(1, workers), total_assets)
    tasks = [(idx, total_assets, asset_id) for idx, asset_id in enumerate(asset_ids, start=1)]
    rows_by_index: Dict[int, Dict[str, Any]] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_fetch_source_detail_for_asset, task) for task in tasks]
        for future in as_completed(futures):
            idx, row = future.result()
            rows_by_index[idx] = row

    ordered_rows = [rows_by_index[idx] for idx in sorted(rows_by_index)]
    return pd.DataFrame(ordered_rows)


def _build_source_detail_frame(base_df: pd.DataFrame, detail_df: pd.DataFrame) -> pd.DataFrame:
    merged = base_df.merge(detail_df, on="asset_id", how="left", suffixes=("", "_detail"))

    expected_columns = [
        "trackingmethod",
        "serviceteam",
        "itSme",
        "itdirector",
        "internalorexternal",
        "devicetype",
        "virtualorphysical",
        "complianceflags",
        "lastauthenticatedscan",
        "lastscanned",
        "uid",
        "dnsname",
        "uuid",
        "owner",
        "division",
        "location",
        "category",
        "status",
        "complianceStatus",
        "pci",
        "pii",
        "application",
        "applications",
        "businessservice",
        "businessServices",
        "publicIpAddresses",
        "privateIpAddresses",
        "qualys_vm_host_id",
        "qualys_vm_host_uid",
        "qualys_vm_host_link",
        "qualys_vm_host_integration",
        "servicenow_host_id",
        "servicenow_host_uid",
        "servicenow_host_link",
        "servicenow_host_integration",
        "hostnameIdentifier",
        "hostnames",
        "displayName",
        "name",
    ]
    for column in expected_columns:
        if column not in merged.columns:
            merged[column] = None

    merged["hostname"] = merged.apply(_canonical_hostname, axis=1)
    merged["tracking_method"] = merged["trackingmethod"].apply(_clean)
    merged["application"] = merged.apply(
        lambda row: _clean(row.get("application")) or _clean(row.get("applications")),
        axis=1,
    )
    merged["business_service"] = merged.apply(
        lambda row: _clean(row.get("businessservice")) or _clean(row.get("businessServices")),
        axis=1,
    )
    merged["service_team"] = merged["serviceteam"].apply(_clean)
    merged["it_sme"] = merged["itSme"].apply(_clean)
    merged["it_director"] = merged["itdirector"].apply(_clean)
    merged["internal_or_external"] = merged["internalorexternal"].apply(_clean)
    merged["device_type"] = merged["devicetype"].apply(_clean)
    merged["virtual_or_physical"] = merged["virtualorphysical"].apply(_clean)
    merged["compliance_flags"] = merged["complianceflags"].apply(_clean)
    merged["public_ip_addresses"] = merged["publicIpAddresses"].apply(_clean)
    merged["private_ip_addresses"] = merged["privateIpAddresses"].apply(_clean)
    merged["last_authenticated_scan"] = merged["lastauthenticatedscan"].apply(_clean)
    merged["last_scanned"] = merged["lastscanned"].apply(_clean)
    merged["uid"] = merged["uid"].apply(_clean)
    merged["dnsname"] = merged["dnsname"].apply(_clean)
    merged["uuid"] = merged["uuid"].apply(_clean)
    merged["owner"] = merged["owner"].apply(_clean)
    merged["division"] = merged["division"].apply(_clean)
    merged["location"] = merged["location"].apply(_clean)
    merged["category"] = merged["category"].apply(_clean)
    merged["status"] = merged["status"].apply(_clean)
    merged["compliance_status"] = merged["complianceStatus"].apply(_clean)
    merged["pci"] = merged["pci"].apply(_to_bool_string)
    merged["pii"] = merged["pii"].apply(_to_bool_string)
    merged["asset_criticality"] = None

    for source_col in (
        "qualys_vm_host_id",
        "qualys_vm_host_uid",
        "qualys_vm_host_link",
        "qualys_vm_host_integration",
        "servicenow_host_id",
        "servicenow_host_uid",
        "servicenow_host_link",
        "servicenow_host_integration",
    ):
        merged[source_col] = merged[source_col].apply(_clean)

    final_df = merged[SOURCE_DETAIL_COLUMNS].copy()
    return final_df.drop_duplicates(subset=["asset_id"])


def _build_final_asset_frame(source_df: pd.DataFrame, context_df: pd.DataFrame) -> pd.DataFrame:
    merged = source_df.merge(context_df, on="asset_id", how="left", suffixes=("", "_context"))
    merged = merged.fillna("")

    final_rows: list[dict[str, Optional[str]]] = []
    for record in merged.to_dict(orient="records"):
        tags = _normalize_tags(record.get("tags"))
        final_rows.append(
            {
                "asset_id": _clean(record.get("asset_id")),
                "hostname": _clean(record.get("hostname")) or _clean(record.get("hostnames")),
                "application": _clean(record.get("application")) or _clean(record.get("applications")),
                "business_service": _clean(record.get("business_service"))
                or _clean(record.get("businessServices")),
                "internal_or_external": _clean(record.get("internal_or_external")),
                "public_ip_addresses": _clean(record.get("public_ip_addresses"))
                or _clean(record.get("publicIpAddresses")),
                "device_type": _clean(record.get("device_type")) or _clean(record.get("type")),
                "category": _clean(record.get("category")),
                "status": _clean(record.get("status")),
                "compliance_flags": _clean(record.get("compliance_flags")),
                "pci": _to_bool_string(record.get("pci")),
                "pii": _to_bool_string(record.get("pii")),
                "tags": _tag_array_literal(tags),
                "environment": _derive_environment(tags, record.get("environments")),
                "qualys_vm_host_id": _clean(record.get("qualys_vm_host_id")),
                "qualys_vm_host_uid": _clean(record.get("qualys_vm_host_uid")),
                "qualys_vm_host_link": _clean(record.get("qualys_vm_host_link")),
                "qualys_vm_host_integration": _clean(record.get("qualys_vm_host_integration")),
                "servicenow_host_id": _clean(record.get("servicenow_host_id")),
                "servicenow_host_uid": _clean(record.get("servicenow_host_uid")),
                "servicenow_host_link": _clean(record.get("servicenow_host_link")),
                "servicenow_host_integration": _clean(record.get("servicenow_host_integration")),
            }
        )

    final_df = pd.DataFrame(final_rows, columns=FINAL_COLUMNS)
    return final_df.drop_duplicates(subset=["asset_id"])


def main() -> None:
    args = parse_args()
    asset_context_path = Path(args.asset_context_csv)
    detail_output_path = Path(args.detail_output)
    output_path = Path(args.output)
    workers = max(1, args.workers)

    base_df = _read_asset_context(asset_context_path).rename(columns={"id": "asset_id"})
    asset_ids = _load_asset_ids(base_df)
    if not asset_ids:
        print("No asset ids found in the base asset business context CSV.")
        return

    detail_df = _fetch_all_source_detail(asset_ids, workers=workers)
    source_detail_df = _build_source_detail_frame(base_df, detail_df)
    final_df = _build_final_asset_frame(source_detail_df, base_df)

    detail_output_path.parent.mkdir(parents=True, exist_ok=True)
    source_detail_df.to_csv(detail_output_path, index=False)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(output_path, index=False)

    print(f"Wrote {len(source_detail_df)} source-detail rows to {detail_output_path}")
    print(f"Wrote {len(final_df)} merged asset rows to {output_path}")
    print(f"Used {min(workers, len(asset_ids))} worker(s) across {len(asset_ids)} asset(s)")
    print("Final columns: " + ", ".join(FINAL_COLUMNS))


if __name__ == "__main__":
    main()

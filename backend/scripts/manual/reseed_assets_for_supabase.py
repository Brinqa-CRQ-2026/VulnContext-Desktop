#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path
import sys

import psycopg2
from psycopg2.extensions import connection as PGConnection

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.env import load_backend_env


DATA_DIR = BACKEND_ROOT / "data"
SOURCE_ASSET_CSV_PATH = DATA_DIR / "assets_source_detail.csv"
ASSET_CONTEXT_CSV_PATH = DATA_DIR / "asset_business_context.csv"
DEFAULT_CSV_PATH = DATA_DIR / "assets_for_supabase.csv"
EXPECTED_ROW_COUNT = 350

CANONICAL_HOST_APPLICATION_COUNTS = {
    ("Digital Storefront", "Identity Verify"): 64,
    ("Digital Storefront", "Virtucon.com"): 33,
    ("Digital Storefront", "Science Lab"): 12,
    ("Logistics", "Order Placement"): 28,
    ("Manufacturing Shop", "File Sharing"): 18,
    ("Shipping and Tracking", "Cyberdyne.com"): 27,
}

CSV_COLUMNS = [
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

TEMP_TABLE_SQL = """
create temporary table asset_reseed_staging (
  asset_id text,
  hostname text,
  application text,
  business_service text,
  internal_or_external text,
  public_ip_addresses text,
  device_type text,
  category text,
  status text,
  compliance_flags text,
  pci text,
  pii text,
  tags text,
  environment text,
  qualys_vm_host_id text,
  qualys_vm_host_uid text,
  qualys_vm_host_link text,
  qualys_vm_host_integration text,
  servicenow_host_id text,
  servicenow_host_uid text,
  servicenow_host_link text,
  servicenow_host_integration text
) on commit drop
"""

TRUNCATE_SQL = """
truncate table public.asset_tag_assignments, public.assets
"""

INSERT_SQL = """
insert into public.assets (
  asset_id,
  hostname,
  application,
  business_service,
  internal_or_external,
  public_ip_addresses,
  device_type,
  category,
  status,
  compliance_flags,
  pci,
  pii,
  tags,
  environment,
  qualys_vm_host_id,
  qualys_vm_host_uid,
  qualys_vm_host_link,
  qualys_vm_host_integration,
  servicenow_host_id,
  servicenow_host_uid,
  servicenow_host_link,
  servicenow_host_integration
)
select
  nullif(asset_id, ''),
  nullif(hostname, ''),
  nullif(application, ''),
  nullif(business_service, ''),
  nullif(internal_or_external, ''),
  nullif(public_ip_addresses, ''),
  nullif(device_type, ''),
  nullif(category, ''),
  nullif(status, ''),
  nullif(compliance_flags, ''),
  case
    when lower(nullif(pci, '')) = 'true' then true
    when lower(nullif(pci, '')) = 'false' then false
    else null
  end,
  case
    when lower(nullif(pii, '')) = 'true' then true
    when lower(nullif(pii, '')) = 'false' then false
    else null
  end,
  case
    when nullif(tags, '') is null then null
    else nullif(tags, '')::text[]
  end,
  nullif(environment, ''),
  nullif(qualys_vm_host_id, ''),
  nullif(qualys_vm_host_uid, ''),
  nullif(qualys_vm_host_link, ''),
  nullif(qualys_vm_host_integration, ''),
  nullif(servicenow_host_id, ''),
  nullif(servicenow_host_uid, ''),
  nullif(servicenow_host_link, ''),
  nullif(servicenow_host_integration, '')
from asset_reseed_staging
"""

BACKFILL_SQL = """
update public.assets a
set company_id = c.id,
    business_unit_id = bu.id,
    business_service_id = bs.id,
    application_id = (
      select app.id
      from public.applications app
      where app.business_service_id = bs.id
        and app.name = a.application
      limit 1
    )
from public.business_services bs
join public.business_units bu on bu.id = bs.business_unit_id
left join public.companies c on c.id = bu.company_id
where a.business_service = bs.name
"""

BACKFILL_TAG_ASSIGNMENTS_SQL = """
insert into public.asset_tag_assignments (
  id,
  asset_id,
  tag_id
)
select
  md5(a.asset_id || ':' || d.id),
  a.asset_id,
  d.id
from public.assets a
cross join lateral unnest(coalesce(a.tags, '{}'::text[])) as tag_name(name)
join public.asset_tag_definitions d on d.name = tag_name.name
"""

APP_COUNTS_SQL = """
select
  business_service,
  application,
  count(*) as asset_count
from public.assets
where application is not null
  and btrim(application) <> ''
group by business_service, application
order by business_service, application
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the merged asset CSV, truncate public.assets, reseed it, and backfill topology FKs.",
    )
    parser.add_argument(
        "--source-asset-csv",
        default=str(SOURCE_ASSET_CSV_PATH),
        help="Path to the local connector-detail source asset CSV.",
    )
    parser.add_argument(
        "--asset-context-csv",
        default=str(ASSET_CONTEXT_CSV_PATH),
        help="Path to the asset business-context CSV.",
    )
    parser.add_argument(
        "--csv",
        dest="csv_path",
        default=str(DEFAULT_CSV_PATH),
        help="Path to the merged asset reseed CSV that will be regenerated before validation/import.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Build and validate the merged CSV without writing to the database.",
    )
    return parser.parse_args()


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _normalize_tags(raw_tags: str) -> list[str]:
    tags: list[str] = []
    for part in _clean(raw_tags).split("|"):
        tag = part.strip()
        if tag and tag not in tags:
            tags.append(tag)
    return tags


def _tag_array_literal(tags: list[str]) -> str:
    if not tags:
        return ""
    escaped = [tag.replace("\\", "\\\\").replace('"', '\\"') for tag in tags]
    return "{" + ",".join(f'"{tag}"' for tag in escaped) + "}"


def _normalize_environment(raw_environment: str) -> str:
    cleaned = _clean(raw_environment).lower()
    if cleaned.startswith("development"):
        return "development"
    if cleaned.startswith("production"):
        return "production"
    if cleaned.startswith("test"):
        return "test"
    if cleaned == "unknown":
        return "unknown"
    return cleaned or "unknown"


def _derive_environment(tags: list[str], raw_environment: str) -> str:
    for tag in tags:
        lowered = tag.lower()
        if lowered in {"development", "production", "test"}:
            return lowered
    return _normalize_environment(raw_environment)


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != CSV_COLUMNS:
            raise ValueError(
                "Unexpected CSV header order. Expected merged asset columns used by public.assets reseed."
            )
        return list(reader)


def build_merged_csv(source_asset_csv_path: Path, asset_context_csv_path: Path, output_csv_path: Path) -> None:
    with source_asset_csv_path.open(newline="", encoding="utf-8") as handle:
        source_rows = list(csv.DictReader(handle))

    with asset_context_csv_path.open(newline="", encoding="utf-8") as handle:
        context_rows = list(csv.DictReader(handle))

    source_by_asset_id = {_clean(row.get("asset_id")): row for row in source_rows if _clean(row.get("asset_id"))}
    context_by_asset_id = {_clean(row.get("id")): row for row in context_rows if _clean(row.get("id"))}

    if len(source_by_asset_id) != len(source_rows):
        raise ValueError("Source asset CSV contains duplicate asset_id values.")
    if len(context_by_asset_id) != len(context_rows):
        raise ValueError("Asset context CSV contains duplicate id values.")
    if set(source_by_asset_id) != set(context_by_asset_id):
        missing_from_context = sorted(set(source_by_asset_id) - set(context_by_asset_id))
        missing_from_source = sorted(set(context_by_asset_id) - set(source_by_asset_id))
        raise ValueError(
            "Source/detail and business-context CSVs do not cover the same asset ids. "
            f"Missing from context: {len(missing_from_context)}. Missing from source: {len(missing_from_source)}."
        )

    merged_rows: list[dict[str, str]] = []
    for asset_id, source_row in source_by_asset_id.items():
        context_row = context_by_asset_id[asset_id]
        tags = _normalize_tags(context_row.get("tags", ""))
        merged_rows.append(
            {
                "asset_id": asset_id,
                "hostname": _clean(source_row.get("hostname")) or _clean(context_row.get("hostnames")),
                "application": _clean(source_row.get("application"))
                or _clean(context_row.get("applications")),
                "business_service": _clean(source_row.get("business_service"))
                or _clean(context_row.get("businessServices")),
                "internal_or_external": _clean(source_row.get("internal_or_external")),
                "public_ip_addresses": _clean(source_row.get("public_ip_addresses"))
                or _clean(context_row.get("publicIpAddresses")),
                "device_type": _clean(source_row.get("device_type")) or _clean(context_row.get("type")),
                "category": _clean(source_row.get("category")),
                "status": _clean(source_row.get("status")),
                "compliance_flags": _clean(source_row.get("compliance_flags")),
                "pci": _clean(source_row.get("pci")).lower(),
                "pii": _clean(source_row.get("pii")).lower(),
                "tags": _tag_array_literal(tags),
                "environment": _derive_environment(tags, context_row.get("environments", "")),
                "qualys_vm_host_id": _clean(source_row.get("qualys_vm_host_id")),
                "qualys_vm_host_uid": _clean(source_row.get("qualys_vm_host_uid")),
                "qualys_vm_host_link": _clean(source_row.get("qualys_vm_host_link")),
                "qualys_vm_host_integration": _clean(source_row.get("qualys_vm_host_integration")),
                "servicenow_host_id": _clean(source_row.get("servicenow_host_id")),
                "servicenow_host_uid": _clean(source_row.get("servicenow_host_uid")),
                "servicenow_host_link": _clean(source_row.get("servicenow_host_link")),
                "servicenow_host_integration": _clean(source_row.get("servicenow_host_integration")),
            }
        )

    output_csv_path.parent.mkdir(parents=True, exist_ok=True)
    with output_csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(merged_rows)


def validate_rows(rows: list[dict[str, str]]) -> dict[tuple[str, str], int]:
    if len(rows) != EXPECTED_ROW_COUNT:
        raise ValueError(f"Expected {EXPECTED_ROW_COUNT} asset rows, found {len(rows)}.")

    asset_ids = [row["asset_id"] for row in rows]
    if len(set(asset_ids)) != len(asset_ids):
        raise ValueError("CSV contains duplicate asset_id values.")

    if not any(_clean(row["tags"]) for row in rows):
        raise ValueError("CSV must include populated tags values.")

    if not all(_clean(row["environment"]) for row in rows):
        raise ValueError("CSV must include an environment value for every asset row.")

    nonblank_application_rows = [
        row
        for row in rows
        if row["application"] is not None and row["application"].strip()
    ]

    pair_counts: dict[tuple[str, str], int] = {}
    for row in nonblank_application_rows:
        pair = (row["business_service"], row["application"])
        pair_counts[pair] = pair_counts.get(pair, 0) + 1

    if pair_counts != CANONICAL_HOST_APPLICATION_COUNTS:
        raise ValueError(
            "CSV nonblank application topology does not match the canonical seeded application counts."
        )

    return pair_counts


def resolve_database_url() -> str:
    load_backend_env()
    for key in ("SUPABASE_DB_URL", "POSTGRES_DATABASE_URL", "DATABASE_URL"):
        value = os.environ.get(key, "").strip()
        if value.startswith(("postgresql://", "postgres://")):
            return value
    raise RuntimeError("No Postgres database URL found in backend env.")


def copy_csv_into_staging(conn: PGConnection, csv_path: Path) -> None:
    with conn.cursor() as cur:
        cur.execute(TEMP_TABLE_SQL)
        with csv_path.open("r", encoding="utf-8", newline="") as handle:
            cur.copy_expert(
                f"copy asset_reseed_staging ({', '.join(CSV_COLUMNS)}) from stdin with csv header",
                handle,
            )


def fetch_scalar(cur, query: str) -> int:
    cur.execute(query)
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("Expected a scalar query result.")
    return int(row[0])


def run_reseed(csv_path: Path) -> None:
    database_url = resolve_database_url()
    with psycopg2.connect(database_url) as conn:
        copy_csv_into_staging(conn, csv_path)
        with conn.cursor() as cur:
            cur.execute(TRUNCATE_SQL)
            cur.execute(INSERT_SQL)
            cur.execute(BACKFILL_SQL)
            cur.execute(BACKFILL_TAG_ASSIGNMENTS_SQL)

            asset_total = fetch_scalar(cur, "select count(*) from public.assets")
            null_application_fk_total = fetch_scalar(
                cur,
                """
                select count(*)
                from public.assets
                where application is not null
                  and btrim(application) <> ''
                  and application_id is null
                """,
            )
            orphan_findings_total = fetch_scalar(
                cur,
                """
                select count(*)
                from public.findings f
                left join public.assets a on a.asset_id = f.asset_id
                where a.asset_id is null
                """,
            )
            populated_scoring_total = fetch_scalar(
                cur,
                """
                select count(*)
                from public.assets
                where crq_asset_aggregated_finding_risk is not null
                   or crq_asset_exposure_score is not null
                   or crq_asset_data_sensitivity_score is not null
                   or crq_asset_environment_score is not null
                   or crq_asset_type_score is not null
                   or crq_asset_context_score is not null
                   or crq_asset_risk_score is not null
                   or crq_asset_scored_at is not null
                """,
            )
            tag_assignment_total = fetch_scalar(
                cur,
                "select count(*) from public.asset_tag_assignments",
            )

            cur.execute(APP_COUNTS_SQL)
            app_counts = cur.fetchall()

        conn.commit()

    print(f"Reseeded public.assets from {csv_path}.")
    print(f"Asset row count: {asset_total}")
    print(f"Assets with nonblank application but null application_id: {null_application_fk_total}")
    print(f"Findings without matching asset: {orphan_findings_total}")
    print(f"Assets with populated scoring fields after reseed: {populated_scoring_total}")
    print(f"Asset tag assignments restored from tags arrays: {tag_assignment_total}")
    print("Application asset counts:")
    for business_service, application, asset_count in app_counts:
        print(f"  - {business_service} / {application}: {asset_count}")


def main() -> None:
    args = parse_args()
    source_asset_csv_path = Path(args.source_asset_csv).resolve()
    asset_context_csv_path = Path(args.asset_context_csv).resolve()
    csv_path = Path(args.csv_path).resolve()

    build_merged_csv(source_asset_csv_path, asset_context_csv_path, csv_path)
    rows = load_rows(csv_path)
    pair_counts = validate_rows(rows)

    print(f"Built and validated {len(rows)} asset rows in {csv_path}.")
    for pair, count in sorted(pair_counts.items()):
        print(f"  - {pair[0]} / {pair[1]}: {count}")

    if args.validate_only:
        return

    run_reseed(csv_path)


if __name__ == "__main__":
    main()

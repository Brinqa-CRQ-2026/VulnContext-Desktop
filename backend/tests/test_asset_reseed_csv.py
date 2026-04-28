from __future__ import annotations

import csv
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
CSV_PATH = DATA_DIR / "assets_for_supabase.csv"
SOURCE_CSV_PATH = DATA_DIR / "assets_source_detail.csv"
CONTEXT_CSV_PATH = DATA_DIR / "asset_business_context.csv"

EXPECTED_APPLICATION_COUNTS = {
    ("Digital Storefront", "Identity Verify"): 64,
    ("Digital Storefront", "Virtucon.com"): 33,
    ("Digital Storefront", "Science Lab"): 12,
    ("Logistics", "Order Placement"): 28,
    ("Manufacturing Shop", "File Sharing"): 18,
    ("Shipping and Tracking", "Cyberdyne.com"): 27,
}

EXPECTED_COLUMNS = [
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


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _parse_tags(value: str) -> list[str]:
    cleaned = value.strip()
    if not cleaned:
        return []
    assert cleaned.startswith("{") and cleaned.endswith("}")
    inner = cleaned[1:-1]
    if not inner:
        return []
    return [part.strip().strip('"') for part in inner.split(",")]


def test_asset_reseed_csv_matches_source_row_count_and_unique_ids():
    rows = _read_csv(CSV_PATH)
    source_rows = _read_csv(SOURCE_CSV_PATH)

    assert len(rows) == len(source_rows) == 350

    asset_ids = [row["asset_id"] for row in rows]
    assert len(set(asset_ids)) == len(asset_ids)


def test_asset_reseed_csv_has_expected_columns_and_application_pairs():
    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == EXPECTED_COLUMNS
        rows = list(reader)

    application_rows = [row for row in rows if row["application"].strip()]
    pair_counts: dict[tuple[str, str], int] = {}
    for row in application_rows:
        pair = (row["business_service"], row["application"])
        pair_counts[pair] = pair_counts.get(pair, 0) + 1

    assert pair_counts == EXPECTED_APPLICATION_COUNTS


def test_asset_reseed_csv_derives_tags_and_environment_from_business_context():
    rows = _read_csv(CSV_PATH)
    context_rows = _read_csv(CONTEXT_CSV_PATH)

    rows_by_asset_id = {row["asset_id"]: row for row in rows}

    development_sample = next(row for row in context_rows if row["tags"].strip() == "Development")
    production_sample = next(row for row in context_rows if row["tags"].strip() == "Production")
    test_sample = next(row for row in context_rows if row["tags"].strip() == "Test")
    unknown_sample = next(row for row in context_rows if row["environments"].strip() == "Unknown")
    multi_tag_sample = next(
        row
        for row in context_rows
        if row["tags"].strip() in {"PCI | PII | Production", "PCI | Production | PII"}
    )

    assert rows_by_asset_id[development_sample["id"]]["environment"] == "development"
    assert rows_by_asset_id[production_sample["id"]]["environment"] == "production"
    assert rows_by_asset_id[test_sample["id"]]["environment"] == "test"
    assert rows_by_asset_id[unknown_sample["id"]]["environment"] == "unknown"

    assert _parse_tags(rows_by_asset_id[multi_tag_sample["id"]]["tags"]) == ["PCI", "PII", "Production"]
    assert any(row["tags"].strip() for row in rows)

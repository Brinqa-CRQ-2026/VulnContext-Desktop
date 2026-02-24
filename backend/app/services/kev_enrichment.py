from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class KevRecord:
    cve_id: str
    date_added: datetime | None = None
    due_date: datetime | None = None
    vendor_project: str | None = None
    product: str | None = None
    vulnerability_name: str | None = None
    short_description: str | None = None
    required_action: str | None = None
    ransomware_use: str | None = None


def _parse_date(value: str | None) -> datetime | None:
    raw = (value or "").strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _first_present(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        if key in row and row[key]:
            return row[key]
    return None


def load_kev_catalog(csv_path: str | Path) -> dict[str, KevRecord]:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"KEV CSV not found: {path}")

    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        if not reader.fieldnames:
            raise ValueError("KEV CSV appears empty or missing headers.")

        catalog: dict[str, KevRecord] = {}
        for row in reader:
            raw_cve = _first_present(row, "cveID", "cveId", "CVE", "cve")
            cve_id = (raw_cve or "").strip().upper()
            if not cve_id:
                continue

            date_added = _parse_date(_first_present(row, "dateAdded", "date_added"))
            due_date = _parse_date(_first_present(row, "dueDate", "due_date"))
            catalog[cve_id] = KevRecord(
                cve_id=cve_id,
                date_added=date_added,
                due_date=due_date,
                vendor_project=(_first_present(row, "vendorProject") or "").strip() or None,
                product=(_first_present(row, "product") or "").strip() or None,
                vulnerability_name=(_first_present(row, "vulnerabilityName") or "").strip() or None,
                short_description=(_first_present(row, "shortDescription") or "").strip() or None,
                required_action=(_first_present(row, "requiredAction") or "").strip() or None,
                ransomware_use=(
                    (_first_present(row, "knownRansomwareCampaignUse") or "").strip() or None
                ),
            )

    return catalog


def kev_record_for_cve(catalog: dict[str, KevRecord] | None, cve_id: str | None) -> KevRecord | None:
    if not catalog or not cve_id:
        return None
    return catalog.get(cve_id.strip().upper())

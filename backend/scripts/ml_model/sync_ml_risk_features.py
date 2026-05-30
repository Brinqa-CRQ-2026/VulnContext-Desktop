from __future__ import annotations

import ast
import json
import os
import re
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from dotenv import load_dotenv


import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.db import SessionLocal, Base, engine
from app import models
from bql_Client import BrinqaBQLClient, chunked

NVD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "NVD_Download")
YEAR_START = 2002
YEAR_END = 2026

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"
LIMIT = 1000
CONTAINER_BATCH_SIZE = 200
# MAX_PAGES = 1

CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)


HOST_FIELDS = [
    "id",
    "uid",
    "displayName",
    "name",
    "type",
    "operatingSystem",
    "osFamily",
    "cloudProvider",
    "cloudRegion",
    "environments",
    "profiles",
    "tags",
    "technologies",
    "publicIpAddresses",
]

VULN_FIELDS = [
    "id",
    "uid",
    "displayName",
    "name",
    "summary",
    "ageInDays",
    "targets",
]

FINDING_DEF_FIELDS = [
    "displayName",
    "description",
    "cveIds",

    "cvssV3AttackComplexity",
    "cvssV3AttackVector",
    "cvssV3AvailabilityImpact",
    "cvssV3BaseScore",
    "cvssV3ConfidentialityImpact",
    "cvssV3IntegrityImpact",
    "cvssV3PrivilegesRequired",
    "cvssV3UserInteraction",

    "cvssV2BaseScore",
    "cvssV2AccessVector",
    "cvssV2AccessComplexity",
    "cvssV2Authentication",
    "cvssV2ConfidentialityImpact",
    "cvssV2IntegrityImpact",
    "cvssV2AvailabilityImpact",
]


def safe_parse_any(x: Any) -> Any:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None

    if isinstance(x, (list, dict)):
        return x

    s = str(x).strip()
    if s in ("", "[]", "{}", "None", "null", "nan"):
        if s == "[]":
            return []
        if s == "{}":
            return {}
        return None

    try:
        return json.loads(s)
    except Exception:
        try:
            return ast.literal_eval(s)
        except Exception:
            return s


def safe_parse_list(x: Any) -> list[Any]:
    v = safe_parse_any(x)
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, dict):
        return [v]
    return []


def extract_display_values(x: Any) -> list[str]:
    items = safe_parse_list(x)
    values: list[str] = []

    for item in items:
        if not isinstance(item, dict):
            continue

        display_name = item.get("displayName")
        if display_name and str(display_name).strip():
            values.append(str(display_name).strip())
            continue

        metadata = item.get("$metadata") or {}
        if isinstance(metadata, str):
            metadata = safe_parse_any(metadata)

        if isinstance(metadata, dict):
            display_value = metadata.get("displayValue")
            if display_value and str(display_value).strip():
                values.append(str(display_value).strip())

    deduped = []
    seen = set()
    for value in values:
        if value not in seen:
            seen.add(value)
            deduped.append(value)

    return deduped


def join_display_values(x: Any, sep: str = "|") -> str | None:
    parsed = safe_parse_any(x)

    if isinstance(parsed, (str, int, float)) and parsed is not None:
        value = str(parsed).strip()
        if value and value.lower() not in ("none", "null", "nan"):
            return value
        return None

    values = extract_display_values(parsed)
    return sep.join(values) if values else None


def extract_ip_list(x: Any) -> list[str]:
    parsed = safe_parse_any(x)

    if parsed is None:
        return []

    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]

    if isinstance(parsed, str):
        value = parsed.strip()
        if value and value.lower() not in ("none", "null", "nan", "[]"):
            return [value]

    return []


def is_internet_exposed(host_row: dict[str, Any]) -> int:
    return 1 if extract_ip_list(host_row.get("publicIpAddresses")) else 0


def extract_cve_id(vuln_row: dict[str, Any]) -> str | None:
    for field in ("displayName", "summary", "name"):
        value = vuln_row.get(field)
        if value is None:
            continue

        match = CVE_RE.search(str(value))
        if match:
            return match.group(0).upper()

    return None


def extract_target_rows(vulns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []

    for vuln in vulns:
        targets = safe_parse_list(vuln.get("targets"))

        for target in targets:
            if not isinstance(target, dict):
                continue

            metadata = target.get("$metadata") or {}
            if isinstance(metadata, str):
                metadata = safe_parse_any(metadata)

            if not isinstance(metadata, dict):
                metadata = {}

            rows.append(
                {
                    "vulnerability_id": vuln.get("id"),
                    "vulnerability_uid": vuln.get("uid"),
                    "finding_id": str(vuln.get("id")),
                    "cve_id": extract_cve_id(vuln),
                    "target_model": metadata.get("dataModelName"),
                    "target_id": target.get("id"),
                    "target_display_name": target.get("displayName"),
                    "age_in_days": vuln.get("ageInDays"),
                }
            )

    return rows


def parse_cve_ids(value: Any) -> list[str]:
    parsed = safe_parse_list(value)
    cves = []

    for item in parsed:
        text = str(item).strip().upper()
        if CVE_RE.match(text):
            cves.append(text)

    return cves


def build_finding_definition_lookup(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup = {}

    for row in rows:
        for cve_id in parse_cve_ids(row.get("cveIds")):
            if cve_id not in lookup:
                lookup[cve_id] = row

    return lookup


def container_host_id(container: dict[str, Any]) -> int | None:
    host_id = container.get("hostId")
    if host_id in (None, "", "null"):
        return None

    try:
        return int(host_id)
    except Exception:
        return None


def build_container_lookup(
    client: BrinqaBQLClient,
    container_ids: list[int],
) -> dict[int, dict[str, Any]]:
    if not container_ids:
        return {}

    unique_ids = sorted(set(int(x) for x in container_ids))

    calling_context = {
        "rootContextType": "DATA_MODEL",
        "rootContextName": "containerDefaultList",
        "viewType": "LIST",
        "rootDataModel": "Container",
        "returnDataModel": "Container",
    }

    fields = [
        "id",
        "hostId",
        "environments",
        "profiles",
        "technologies",
        "type",
    ]

    container_by_id = {}

    for batch in chunked(unique_ids, CONTAINER_BATCH_SIZE):
        clauses = " OR ".join(f"c.id = {int(x)}" for x in batch)
        query = f'FIND Container AS c WHERE ({clauses}) AND c.__appName__ = "caasm"'

        payload = {
            "callingContext": calling_context,
            "query": query,
            "limit": 5000,
            "skip": 0,
            "returningFields": fields,
            "format": "dataset",
            "refresh": True,
        }

        rows = client.post(payload)

        for row in rows:
            container_id = row.get("id")
            if container_id is not None:
                container_by_id[int(container_id)] = row

    return container_by_id


def fetch_hosts(client: BrinqaBQLClient) -> list[dict[str, Any]]:
    return client.paged_dataset(
        calling_context={
            "rootContextType": "DATA_MODEL",
            "rootContextName": "hostDefaultList",
            "viewType": "LIST",
            "rootDataModel": "Host",
            "returnDataModel": "Host",
        },
        query='FIND Host AS h WHERE h.__appName__ = "caasm"',
        returning_fields=HOST_FIELDS,
        limit=LIMIT,
        refresh=True,
        # max_pages=MAX_PAGES,
    )


def fetch_vulnerability_page(
    client: BrinqaBQLClient,
    *,
    skip: int,
    limit: int,
) -> list[dict[str, Any]]:
    payload = {
        "callingContext": {
            "rootContextType": "DATA_MODEL",
            "rootContextName": "vulnerabilityDefaultList",
            "viewType": "LIST",
            "rootDataModel": "Vulnerability",
            "returnDataModel": "Vulnerability",
        },
        "query": 'FIND Vulnerability AS v WHERE v.__appName__ = "caasm"',
        "limit": limit,
        "skip": skip,
        "returningFields": VULN_FIELDS,
        "format": "dataset",
        "refresh": True,
    }

    return client.post(payload)


def fetch_finding_definitions(client: BrinqaBQLClient) -> list[dict[str, Any]]:
    return client.paged_dataset(
        calling_context={
            "rootContextType": "DATA_MODEL",
            "rootContextName": "findingDefinitionDefaultList",
            "viewType": "LIST",
            "rootDataModel": "FindingDefinition",
            "returnDataModel": "FindingDefinition",
        },
        query="FIND FindingDefinition AS f WHERE f.cveIds IS NOT NULL",
        returning_fields=FINDING_DEF_FIELDS,
        limit=LIMIT,
        refresh=True,
        # max_pages=MAX_PAGES,
    )


def to_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:
        return float(value)
    except Exception:
        return None


def is_missing_metric(value: Any) -> bool:
    if value is None:
        return True

    text = str(value).strip().lower()

    return text in {
        "",
        "none",
        "null",
        "nan",
        "undefined",
        "not defined",
        "not_defined",
        "n/a",
        "na",
    }


def merged_cve_metrics(
    cve_id: str | None,
    brinqa_def: dict[str, Any],
    nvd_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    nvd_def = nvd_lookup.get(cve_id or "", {})

    keys = [
        "cvssV3BaseScore",
        "cvssV3AttackVector",
        "cvssV3AttackComplexity",
        "cvssV3PrivilegesRequired",
        "cvssV3UserInteraction",
        "cvssV3ConfidentialityImpact",
        "cvssV3IntegrityImpact",
        "cvssV3AvailabilityImpact",

        "cvssV2BaseScore",
        "cvssV2AccessVector",
        "cvssV2AccessComplexity",
        "cvssV2Authentication",
        "cvssV2ConfidentialityImpact",
        "cvssV2IntegrityImpact",
        "cvssV2AvailabilityImpact",
    ]

    merged = {}

    for key in keys:
        brinqa_value = brinqa_def.get(key)
        nvd_value = nvd_def.get(key)

        if is_missing_metric(brinqa_value):
            merged[key] = nvd_value
        else:
            merged[key] = brinqa_value

    return merged

def build_feature_rows(
    client: BrinqaBQLClient,
    hosts: list[dict[str, Any]],
    vulns: list[dict[str, Any]],
    finding_defs: list[dict[str, Any]],
    nvd_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    hosts_by_id = {}

    for host in hosts:
        host_id = host.get("id")
        if host_id is not None:
            hosts_by_id[int(host_id)] = host

    target_rows = extract_target_rows(vulns)

    container_ids = []
    for row in target_rows:
        if str(row.get("target_model") or "").lower() == "container":
            target_id = row.get("target_id")
            if target_id is not None:
                try:
                    container_ids.append(int(target_id))
                except Exception:
                    pass

    container_by_id = build_container_lookup(client, container_ids)
    cve_lookup = build_finding_definition_lookup(finding_defs)
    print("Finding definitions fetched:", len(finding_defs))
    print("CVE lookup size:", len(cve_lookup))

    feature_rows = []
    now = datetime.now(timezone.utc)
    
    matched_cve_count = 0
    missing_cve_count = 0
    total_cve_count = 0
    for row in target_rows:
        target_model = str(row.get("target_model") or "").strip()
        target_id = row.get("target_id")
        cve_id = row.get("cve_id")
        

        linked_host_id = None
        asset_id = str(target_id) if target_id is not None else None

        asset_environments = None
        asset_profiles = None
        asset_type = None
        asset_os_family = None
        asset_cloud_provider = None
        internet_exposed = 0

        if target_model.lower() == "host" and target_id is not None:
            try:
                linked_host_id = int(target_id)
            except Exception:
                linked_host_id = None

            host = hosts_by_id.get(linked_host_id)
            if host:
                asset_id = str(host.get("id"))
                asset_environments = join_display_values(host.get("environments"))
                asset_profiles = join_display_values(host.get("profiles"))
                asset_type = join_display_values(host.get("type"))
                asset_os_family = join_display_values(host.get("osFamily"))
                asset_cloud_provider = join_display_values(host.get("cloudProvider"))
                internet_exposed = is_internet_exposed(host)

        elif target_model.lower() == "container" and target_id is not None:
            try:
                container = container_by_id.get(int(target_id)) or {}
            except Exception:
                container = {}

            linked_host_id = container_host_id(container)

            asset_environments = join_display_values(container.get("environments"))
            asset_profiles = join_display_values(container.get("profiles"))
            asset_type = join_display_values(container.get("type"))

            if linked_host_id is not None:
                host = hosts_by_id.get(linked_host_id)
                if host:
                    asset_os_family = join_display_values(host.get("osFamily"))
                    asset_cloud_provider = join_display_values(host.get("cloudProvider"))
                    internet_exposed = is_internet_exposed(host)

        # brinqa_cve_def = cve_lookup.get(cve_id or "", {})
        # cve_def = merged_cve_metrics(cve_id, brinqa_cve_def, nvd_lookup)
        brinqa_cve_def = cve_lookup.get(cve_id or "")
        nvd_cve_def = nvd_lookup.get(cve_id or "")

        if cve_id:
            total_cve_count += 1

            if brinqa_cve_def or nvd_cve_def:
                matched_cve_count += 1
            else:
                missing_cve_count += 1

        cve_def = merged_cve_metrics(
            cve_id,
            brinqa_cve_def or {},
            nvd_lookup,
        )
        if cve_id == "CVE-2020-1712":
            print("\n==============================")
            print("DEBUG CVE-2020-1712")
            print("==============================")

            print("finding_id:", row.get("finding_id"))
            print("target_model:", target_model)
            print("target_id:", target_id)
            print("asset_id:", asset_id)

            print("\nCVE extracted from vulnerability:")
            print(cve_id)

            print("\nDid CVE lookup match?")
            print(bool(cve_def))

            if cve_def:
                print("\nFindingDefinition keys:")
                print(sorted(cve_def.keys()))

                print("\nCVSSv3 values:")
                print("Base:", cve_def.get("cvssV3BaseScore"))
                print("AttackVector:", cve_def.get("cvssV3AttackVector"))
                print("AttackComplexity:", cve_def.get("cvssV3AttackComplexity"))
                print("PrivilegesRequired:", cve_def.get("cvssV3PrivilegesRequired"))
                print("UserInteraction:", cve_def.get("cvssV3UserInteraction"))
                print("ConfidentialityImpact:", cve_def.get("cvssV3ConfidentialityImpact"))
                print("IntegrityImpact:", cve_def.get("cvssV3IntegrityImpact"))
                print("AvailabilityImpact:", cve_def.get("cvssV3AvailabilityImpact"))

            else:
                print("\nNo FindingDefinition match found.")

                print("\nTrying fuzzy search in finding_defs...")
                for fd in finding_defs[:20]:
                    cves = fd.get("cveIds")
                    if cves and "2020-1712" in str(cves):
                        print("Potential match:")
                        print(fd)
        if cve_def:
            matched_cve_count += 1
        else:
            missing_cve_count += 1

        feature_rows.append(
            {
                "finding_id": str(row["finding_id"]),
                "asset_id": asset_id,
                "cve_id": cve_id,

                "target_model": target_model or None,
                "age_in_days": to_float(row.get("age_in_days")),
                "internet_exposed": internet_exposed,

                "asset_environments": asset_environments,
                "asset_profiles": asset_profiles,
                "asset_type": asset_type,
                "asset_os_family": asset_os_family,
                "asset_cloud_provider": asset_cloud_provider,

                "cvss_v3_base_score": to_float(cve_def.get("cvssV3BaseScore")),
                "cvss_v3_attack_vector": cve_def.get("cvssV3AttackVector"),
                "cvss_v3_attack_complexity": cve_def.get("cvssV3AttackComplexity"),
                "cvss_v3_privileges_required": cve_def.get("cvssV3PrivilegesRequired"),
                "cvss_v3_user_interaction": cve_def.get("cvssV3UserInteraction"),
                "cvss_v3_confidentiality_impact": cve_def.get("cvssV3ConfidentialityImpact"),
                "cvss_v3_integrity_impact": cve_def.get("cvssV3IntegrityImpact"),
                "cvss_v3_availability_impact": cve_def.get("cvssV3AvailabilityImpact"),

                "cvss_v2_base_score": to_float(cve_def.get("cvssV2BaseScore")),
                "cvss_v2_access_vector": cve_def.get("cvssV2AccessVector"),
                "cvss_v2_access_complexity": cve_def.get("cvssV2AccessComplexity"),
                "cvss_v2_authentication": cve_def.get("cvssV2Authentication"),
                "cvss_v2_confidentiality_impact": cve_def.get("cvssV2ConfidentialityImpact"),
                "cvss_v2_integrity_impact": cve_def.get("cvssV2IntegrityImpact"),
                "cvss_v2_availability_impact": cve_def.get("cvssV2AvailabilityImpact"),

                "feature_snapshot_at": now,
            }
        )
    print("Total CVE rows:", total_cve_count)
    print("Matched CVEs:", matched_cve_count)
    print("Missing CVEs:", missing_cve_count)
    return feature_rows

import gzip


def load_json_maybe_gz(path: str) -> dict:
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return json.load(f)

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_nvd_lookup() -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}

    for year in range(YEAR_START, YEAR_END + 1):
        path = os.path.join(NVD_DIR, f"nvdcve-2.0-{year}.json.gz")
        if not os.path.exists(path):
            continue

        data = load_json_maybe_gz(path)

        for vuln in data.get("vulnerabilities", []):
            cve = vuln.get("cve", {}) or {}
            cve_id = cve.get("id")
            if not cve_id:
                continue

            metrics = cve.get("metrics", {}) or {}

            m31 = metrics.get("cvssMetricV31")
            m30 = metrics.get("cvssMetricV30")
            m2 = metrics.get("cvssMetricV2")

            if m31:
                entry = m31[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows[cve_id] = {
                    "cvssV3BaseScore": cvss.get("baseScore"),
                    "cvssV3AttackVector": cvss.get("attackVector"),
                    "cvssV3AttackComplexity": cvss.get("attackComplexity"),
                    "cvssV3PrivilegesRequired": cvss.get("privilegesRequired"),
                    "cvssV3UserInteraction": cvss.get("userInteraction"),
                    "cvssV3ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV3IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV3AvailabilityImpact": cvss.get("availabilityImpact"),
                }
                continue

            if m30:
                entry = m30[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows[cve_id] = {
                    "cvssV3BaseScore": cvss.get("baseScore"),
                    "cvssV3AttackVector": cvss.get("attackVector"),
                    "cvssV3AttackComplexity": cvss.get("attackComplexity"),
                    "cvssV3PrivilegesRequired": cvss.get("privilegesRequired"),
                    "cvssV3UserInteraction": cvss.get("userInteraction"),
                    "cvssV3ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV3IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV3AvailabilityImpact": cvss.get("availabilityImpact"),
                }
                continue

            if m2:
                entry = m2[0] or {}
                cvss = entry.get("cvssData", {}) or {}
                rows[cve_id] = {
                    "cvssV2BaseScore": cvss.get("baseScore"),
                    "cvssV2AccessVector": cvss.get("accessVector"),
                    "cvssV2AccessComplexity": cvss.get("accessComplexity"),
                    "cvssV2Authentication": cvss.get("authentication"),
                    "cvssV2ConfidentialityImpact": cvss.get("confidentialityImpact"),
                    "cvssV2IntegrityImpact": cvss.get("integrityImpact"),
                    "cvssV2AvailabilityImpact": cvss.get("availabilityImpact"),
                }

    print("NVD lookup size:", len(rows))
    return rows


def upsert_ml_risk_feature(db, data: dict[str, Any]) -> None:
    row = (
        db.query(models.MLRiskFeature)
        .filter(models.MLRiskFeature.finding_id == data["finding_id"])
        .first()
    )

    if row is None:
        row = models.MLRiskFeature(**data)
        db.add(row)
        return

    for key, value in data.items():
        setattr(row, key, value)


def main() -> None:
    load_dotenv()
    Base.metadata.create_all(bind=engine)

    client = BrinqaBQLClient(
        api_url=API_URL,
        origin="https://ucsc.brinqa.net",
        referer="https://ucsc.brinqa.net/caasm",
        timeout_sec=90,
    )

    print("Fetching hosts...")
    hosts = fetch_hosts(client)

    print("Fetching finding definitions...")
    finding_defs = fetch_finding_definitions(client)

    print("Building NVD lookup...")
    nvd_lookup = build_nvd_lookup()

    PAGE_SIZE = 1000
    skip = 0
    total_processed = 0

    db = SessionLocal()

    try:
        while True:
            print(f"\nFetching vulnerability page skip={skip}")

            vulns = fetch_vulnerability_page(
                client,
                skip=skip,
                limit=PAGE_SIZE,
            )

            if not vulns:
                break

            feature_rows = build_feature_rows(
                client=client,
                hosts=hosts,
                vulns=vulns,
                finding_defs=finding_defs,
                nvd_lookup=nvd_lookup,
            )

            print("Built feature rows:", len(feature_rows))

            for row in feature_rows:
                upsert_ml_risk_feature(db, row)

            db.commit()

            total_processed += len(feature_rows)
            print("Total processed:", total_processed)

            skip += PAGE_SIZE

        print(f"Done. Upserted {total_processed} ML risk feature rows.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
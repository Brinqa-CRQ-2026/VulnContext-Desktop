from datetime import datetime, timezone
from typing import Any

from bql_Client import BrinqaBQLClient

from brinqa_fetcher import build_container_lookup
from nvd_enrichment import merged_cve_metrics
from parsing import (
    extract_cve_id,
    join_display_values,
    parse_cve_ids,
    safe_parse_any,
    safe_parse_list,
    to_float,
    extract_ip_list,
)


def is_internet_exposed(host_row: dict[str, Any]) -> int:
    return 1 if extract_ip_list(host_row.get("publicIpAddresses")) else 0


def container_host_id(container: dict[str, Any]) -> int | None:
    host_id = container.get("hostId")
    if host_id in (None, "", "null"):
        return None

    try:
        return int(host_id)
    except Exception:
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


def build_finding_definition_lookup(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup = {}

    for row in rows:
        for cve_id in parse_cve_ids(row.get("cveIds")):
            if cve_id not in lookup:
                lookup[cve_id] = row

    return lookup


def build_feature_rows(
    client: BrinqaBQLClient,
    hosts: list[dict[str, Any]],
    vulns: list[dict[str, Any]],
    finding_defs: list[dict[str, Any]],
    nvd_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    hosts_by_id = {
        int(host["id"]): host
        for host in hosts
        if host.get("id") is not None
    }

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

    feature_rows = []
    now = datetime.now(timezone.utc)

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

        brinqa_cve_def = cve_lookup.get(cve_id or "", {})
        cve_def = merged_cve_metrics(cve_id, brinqa_cve_def, nvd_lookup)

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

    return feature_rows
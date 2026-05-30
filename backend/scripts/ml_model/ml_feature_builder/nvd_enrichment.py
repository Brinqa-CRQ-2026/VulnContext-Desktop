import gzip
import json
import os
from typing import Any

from config import NVD_DIR, YEAR_END, YEAR_START
from parsing import is_missing_metric


def load_json_maybe_gz(path: str) -> dict:
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8") as file:
            return json.load(file)

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


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

            for key in ("cvssMetricV31", "cvssMetricV30"):
                metric = metrics.get(key)
                if metric:
                    entry = metric[0] or {}
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
                    break
            else:
                metric = metrics.get("cvssMetricV2")
                if metric:
                    entry = metric[0] or {}
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
        merged[key] = nvd_value if is_missing_metric(brinqa_value) else brinqa_value

    return merged
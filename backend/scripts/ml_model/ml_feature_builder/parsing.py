import ast
import json
from typing import Any

import pandas as pd

from config import CVE_RE


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
    value = safe_parse_any(x)
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return []


def extract_display_values(x: Any) -> list[str]:
    items = safe_parse_list(x)
    values = []

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


def extract_cve_id(vuln_row: dict[str, Any]) -> str | None:
    for field in ("displayName", "summary", "name"):
        value = vuln_row.get(field)
        if value is None:
            continue

        match = CVE_RE.search(str(value))
        if match:
            return match.group(0).upper()

    return None


def parse_cve_ids(value: Any) -> list[str]:
    parsed = safe_parse_list(value)
    cves = []

    for item in parsed:
        text = str(item).strip().upper()
        if CVE_RE.match(text):
            cves.append(text)

    return cves


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
# app/seed.py
import csv
import io
import requests
from pathlib import Path

from app.core.db import SessionLocal, engine, Base, ensure_database_schema
from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights
from app.models import ScoredFinding, EpssScore
from app.scoring import score_finding_dict


ASSET_CRITICALITY_MAP = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}

REQUIRED_CSV_COLUMNS = {
    "finding_id",
    "asset_id",
    "cvss_score",
    "internet_exposed",
    "asset_criticality",
    "vuln_age_days",
    "auth_required",
    "times_detected",
}

def fetch_epss_score(db, cve_id):
    if not cve_id:
        return 0.0
    row = db.query(EpssScore).filter(EpssScore.cve_id == cve_id).first()
    if not row:
        return 0.0
    return row.percentile

def _as_bool(value: str) -> bool:
    return str(value).strip().lower() in ("1", "true", "yes")


def _require_int(value: str, field_name: str, row_num: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Row {row_num}: '{field_name}' must be an integer.") from exc


def _require_float(value: str, field_name: str, row_num: int) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Row {row_num}: '{field_name}' must be a number.") from exc


def _build_scored_finding_from_row(
    row: dict[str, str],
    row_num: int,
    source: str,
    weights: RiskWeights,
) -> ScoredFinding:
    db = SessionLocal()
    finding_id = (row.get("finding_id") or "").strip()
    asset_id = (row.get("asset_id") or "").strip()
    if not finding_id:
        raise ValueError(f"Row {row_num}: 'finding_id' is required.")
    if not asset_id:
        raise ValueError(f"Row {row_num}: 'asset_id' is required.")

    asset_crit_label = (row.get("asset_criticality") or "").strip()
    crit_key = asset_crit_label.lower()
    if crit_key not in ASSET_CRITICALITY_MAP:
        raise ValueError(
            f"Row {row_num}: invalid 'asset_criticality' value '{asset_crit_label}'."
        )
    asset_crit_numeric = ASSET_CRITICALITY_MAP[crit_key]

    cvss_score = _require_float(row.get("cvss_score"), "cvss_score", row_num)
    if cvss_score < 0 or cvss_score > 10:
        raise ValueError(f"Row {row_num}: 'cvss_score' must be between 0 and 10.")

    epss_score = fetch_epss_score(db, row.get("cve_id"))
    if epss_score < 0 or epss_score > 1:
        raise ValueError(f"Row {row_num}: 'epss_score' must be between 0 and 1.")

    vuln_age_days = _require_int(row.get("vuln_age_days"), "vuln_age_days", row_num)
    times_detected = _require_int(row.get("times_detected"), "times_detected", row_num)

    raw_finding = {
        "finding_id": finding_id,
        "asset_id": asset_id,
        "hostname": row.get("hostname"),
        "ip_address": row.get("ip_address"),
        "operating_system": row.get("operating_system"),
        "asset_type": row.get("asset_type"),
        "cvss_score": cvss_score,
        "epss_score": epss_score,
        "internet_exposed": _as_bool(row.get("internet_exposed", "")),
        "asset_criticality_label": asset_crit_label,
        "asset_criticality": asset_crit_numeric,
        "vuln_age_days": vuln_age_days,
        "auth_required": _as_bool(row.get("auth_required", "")),
        "cve_id": row.get("cve_id"),
        "cwe_id": row.get("cwe_id"),
        "description": row.get("description"),
        "cvss_severity": row.get("cvss_severity"),
        "attack_vector": row.get("attack_vector"),
        "privileges_required": row.get("privileges_required"),
        "user_interaction": row.get("user_interaction"),
        "vector_string": row.get("vector_string"),
        "vuln_published_date": row.get("vuln_published_date"),
        "port": _require_int(row["port"], "port", row_num) if row.get("port") else None,
        "service": row.get("service"),
        "detection_method": row.get("detection_method"),
        "first_detected": row.get("first_detected"),
        "last_detected": row.get("last_detected"),
        "times_detected": times_detected,
    }

    scored = score_finding_dict(raw_finding, weights=weights)
    db.close()
    return ScoredFinding(
        source=source,
        finding_id=scored["finding_id"],
        asset_id=scored["asset_id"],
        hostname=scored.get("hostname"),
        ip_address=scored.get("ip_address"),
        operating_system=scored.get("operating_system"),
        asset_type=scored.get("asset_type"),
        asset_criticality=scored["asset_criticality"],
        cve_id=scored.get("cve_id"),
        cwe_id=scored.get("cwe_id"),
        description=scored.get("description"),
        cvss_score=scored["cvss_score"],
        cvss_severity=scored.get("cvss_severity"),
        epss_score=scored["epss_score"],
        attack_vector=scored.get("attack_vector"),
        privileges_required=scored.get("privileges_required"),
        user_interaction=scored.get("user_interaction"),
        vector_string=scored.get("vector_string"),
        vuln_published_date=scored.get("vuln_published_date"),
        vuln_age_days=scored.get("vuln_age_days"),
        port=scored.get("port"),
        service=scored.get("service"),
        internet_exposed=scored["internet_exposed"],
        auth_required=scored["auth_required"],
        detection_method=scored.get("detection_method"),
        first_detected=scored.get("first_detected"),
        last_detected=scored.get("last_detected"),
        times_detected=scored.get("times_detected"),
        risk_score=scored["risk_score"],
        risk_band=scored["risk_band"],
    )

def parse_qualys_csv_to_scored_findings(
    csv_text: str,
    source: str = "qualys",
    weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
) -> list[ScoredFinding]:
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV appears empty or missing a header row.")

    headers = {h.strip() for h in reader.fieldnames if h}
    missing = sorted(REQUIRED_CSV_COLUMNS - headers)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}.")

    rows_to_add: list[ScoredFinding] = []
    for row_num, row in enumerate(reader, start=2):
        if not any((value or "").strip() for value in row.values()):
            continue
        rows_to_add.append(_build_scored_finding_from_row(row, row_num, source, weights))

    if not rows_to_add:
        raise ValueError("CSV has no data rows to insert.")

    return rows_to_add


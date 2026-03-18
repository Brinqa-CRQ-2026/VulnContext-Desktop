import csv
import io
from datetime import datetime

from app.core.risk_weights import DEFAULT_RISK_WEIGHTS, RiskWeights
from app.models import EpssScore, ScoredFinding
from app.scoring import score_finding_dict
from sqlalchemy.orm import Session


REQUIRED_CSV_COLUMNS = {
    "uid",
    "status",
    "status_category",
    "source_status",
    "risk_rating",
    "id",
}


def _clean_str(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _parse_bool(value: str | None) -> bool | None:
    cleaned = _clean_str(value)
    if cleaned is None:
        return None
    lowered = cleaned.lower()
    if lowered in {"1", "true", "yes"}:
        return True
    if lowered in {"0", "false", "no"}:
        return False
    raise ValueError(f"Invalid boolean value '{cleaned}'.")


def _parse_int(value: str | None, field_name: str, row_num: int) -> int | None:
    cleaned = _clean_str(value)
    if cleaned is None:
        return None
    try:
        return int(float(cleaned))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Row {row_num}: '{field_name}' must be an integer.") from exc


def _parse_float(value: str | None, field_name: str, row_num: int) -> float | None:
    cleaned = _clean_str(value)
    if cleaned is None:
        return None
    try:
        return float(cleaned)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Row {row_num}: '{field_name}' must be a number.") from exc


def _parse_datetime(value: str | None, field_name: str, row_num: int) -> datetime | None:
    cleaned = _clean_str(value)
    if cleaned is None:
        return None
    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(
            f"Row {row_num}: '{field_name}' must be an ISO-8601 timestamp."
        ) from exc


def _derive_primary_cve(*values: str | None) -> str | None:
    for value in values:
        cleaned = _clean_str(value)
        if cleaned is None:
            continue
        normalized_text = cleaned.replace("|", ",").replace(";", ",")
        for candidate in normalized_text.split(","):
            normalized = candidate.strip().upper()
            if normalized.startswith("CVE-"):
                return normalized
            if normalized:
                return normalized
    return None


def enrich_findings_with_epss(
    findings: list[ScoredFinding],
    *,
    db: Session,
    weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
) -> int:
    cve_ids = sorted({finding.cve_id for finding in findings if finding.cve_id})
    if not cve_ids:
        return 0

    epss_rows = (
        db.query(EpssScore)
        .filter(EpssScore.cve_id.in_(cve_ids))
        .all()
    )
    epss_by_cve = {row.cve_id.upper(): row for row in epss_rows if row.cve_id}

    enriched = 0
    for finding in findings:
        if not finding.cve_id:
            continue
        epss_row = epss_by_cve.get(finding.cve_id.upper())
        if epss_row is None:
            continue

        finding.epss_score = float(epss_row.probability)
        finding.epss_percentile = float(epss_row.percentile)
        scored = score_finding_dict(
            {
                "cvss_score": finding.cvss_score,
                "epss_score": finding.epss_score,
                "asset_criticality": finding.asset_criticality,
                "context_score": finding.context_score,
                "is_kev": finding.is_kev,
            },
            weights=weights,
        )
        finding.internal_risk_score = scored["internal_risk_score"]
        finding.internal_risk_band = scored["internal_risk_band"]
        enriched += 1

    return enriched


def refresh_persisted_findings_with_epss(
    db: Session,
    *,
    weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
) -> int:
    findings = (
        db.query(ScoredFinding)
        .filter(ScoredFinding.cve_id.is_not(None))
        .all()
    )
    if not findings:
        return 0

    return enrich_findings_with_epss(findings, db=db, weights=weights)


def _derive_risk_band(risk_rating: str | None) -> str | None:
    cleaned = _clean_str(risk_rating)
    if cleaned is None:
        return None
    mapping = {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }
    return mapping.get(cleaned.lower(), cleaned)


def _derive_lifecycle_status(status_category: str | None, source_status: str | None) -> str | None:
    category = (_clean_str(status_category) or "").lower()
    source = (_clean_str(source_status) or "").lower()

    if category == "closed" or source == "fixed":
        return "fixed"
    if category == "open" or source == "active":
        return "active"
    return _clean_str(status_category) or _clean_str(source_status)


def _build_scored_finding_from_row(
    row: dict[str, str],
    row_num: int,
    source: str,
) -> ScoredFinding:
    uid = _clean_str(row.get("uid"))
    record_id = _clean_str(row.get("id"))
    status = _clean_str(row.get("status"))
    status_category = _clean_str(row.get("status_category"))
    source_status = _clean_str(row.get("source_status"))
    risk_rating = _clean_str(row.get("risk_rating"))

    if uid is None:
        raise ValueError(f"Row {row_num}: 'uid' is required.")
    if record_id is None:
        raise ValueError(f"Row {row_num}: 'id' is required.")
    if status is None:
        raise ValueError(f"Row {row_num}: 'status' is required.")
    if status_category is None:
        raise ValueError(f"Row {row_num}: 'status_category' is required.")
    if source_status is None:
        raise ValueError(f"Row {row_num}: 'source_status' is required.")
    if risk_rating is None:
        raise ValueError(f"Row {row_num}: 'risk_rating' is required.")

    risk_score = _parse_float(row.get("risk_score"), "risk_score", row_num)
    base_risk_score = _parse_float(row.get("base_risk_score"), "base_risk_score", row_num)
    age_in_days = _parse_float(row.get("age_in_days"), "age_in_days", row_num)
    sla_days = _parse_float(row.get("sla_days"), "sla_days", row_num)
    risk_factor_offset = _parse_float(
        row.get("risk_factor_offset"), "risk_factor_offset", row_num
    )
    target_count = _parse_int(row.get("target_count"), "target_count", row_num)
    source_count = _parse_int(row.get("source_count"), "source_count", row_num)
    category_count = _parse_int(row.get("category_count"), "category_count", row_num)

    return ScoredFinding(
        source=source,
        uid=uid,
        record_id=record_id,
        display_name=_clean_str(row.get("display_name")),
        cve_id=_derive_primary_cve(row.get("cve_ids"), row.get("cve_record_names")),
        cve_ids=_clean_str(row.get("cve_ids")),
        cve_record_names=_clean_str(row.get("cve_record_names")),
        status=status,
        status_category=status_category,
        source_status=source_status,
        compliance_status=_clean_str(row.get("compliance_status")),
        severity=_clean_str(row.get("severity")),
        risk_factor_names=_clean_str(row.get("risk_factor_names")),
        risk_factor_values=_clean_str(row.get("risk_factor_values")),
        age_in_days=age_in_days,
        first_found=_parse_datetime(row.get("first_found"), "first_found", row_num),
        last_found=_parse_datetime(row.get("last_found"), "last_found", row_num),
        due_date=_parse_datetime(row.get("due_date"), "due_date", row_num),
        cisa_due_date_expired=_parse_bool(row.get("cisa_due_date_expired")),
        target_count=target_count,
        target_ids=_clean_str(row.get("target_ids")),
        target_names=_clean_str(row.get("target_names")),
        attack_pattern_names=_clean_str(row.get("attack_pattern_names")),
        attack_technique_names=_clean_str(row.get("attack_technique_names")),
        attack_tactic_names=_clean_str(row.get("attack_tactic_names")),
        base_risk_score=base_risk_score,
        risk_score=risk_score,
        risk_rating=risk_rating,
        record_link=_clean_str(row.get("record_link")),
        summary=_clean_str(row.get("summary")),
        description=_clean_str(row.get("description")),
        type_display_name=_clean_str(row.get("type_display_name")),
        type_id=_clean_str(row.get("type_id")),
        date_created=_parse_datetime(row.get("date_created"), "date_created", row_num),
        last_updated=_parse_datetime(row.get("last_updated"), "last_updated", row_num),
        sla_days=sla_days,
        sla_level=_clean_str(row.get("sla_level")),
        risk_owner_name=_clean_str(row.get("risk_owner_name")),
        remediation_owner_name=_clean_str(row.get("remediation_owner_name")),
        source_count=source_count,
        source_uids=_clean_str(row.get("source_uids")),
        source_record_uids=_clean_str(row.get("source_record_uids")),
        source_links=_clean_str(row.get("source_links")),
        connector_names=_clean_str(row.get("connector_names")),
        source_connector_names=_clean_str(row.get("source_connector_names")),
        connector_categories=_clean_str(row.get("connector_categories")),
        data_integration_titles=_clean_str(row.get("data_integration_titles")),
        informed_user_names=_clean_str(row.get("informed_user_names")),
        data_model_name=_clean_str(row.get("data_model_name")),
        created_by=_clean_str(row.get("created_by")),
        updated_by=_clean_str(row.get("updated_by")),
        risk_scoring_model_name=_clean_str(row.get("risk_scoring_model_name")),
        sla_definition_name=_clean_str(row.get("sla_definition_name")),
        confidence=_clean_str(row.get("confidence")),
        risk_factor_offset=risk_factor_offset,
        category_count=category_count,
        categories=_clean_str(row.get("categories")),
        risk_band=_derive_risk_band(risk_rating),
        lifecycle_status=_derive_lifecycle_status(status_category, source_status),
        finding_key=f"{source}:{uid}",
        is_present_in_latest_scan=True,
        first_seen_at=_parse_datetime(row.get("first_found"), "first_found", row_num),
        last_seen_at=_parse_datetime(row.get("last_found"), "last_found", row_num),
        fixed_at=(
            _parse_datetime(row.get("last_found"), "last_found", row_num)
            if _derive_lifecycle_status(status_category, source_status) == "fixed"
            else None
        ),
        status_changed_at=_parse_datetime(row.get("last_updated"), "last_updated", row_num),
    )


def parse_staged_findings_csv_to_scored_findings(
    csv_text: str,
    source: str = "unknown",
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
        rows_to_add.append(
            _build_scored_finding_from_row(
                row,
                row_num,
                source,
            )
        )

    if not rows_to_add:
        raise ValueError("CSV has no data rows to insert.")

    return rows_to_add

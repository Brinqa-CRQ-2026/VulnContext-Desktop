import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.scoring import compute_risk_assessment

ALLOWED_DISPOSITIONS = {
    "none",
    "ignored",
    "risk_accepted",
    "false_positive",
    "not_applicable",
}


def display_risk_score(finding: models.ScoredFinding) -> float | None:
    if finding.internal_risk_score is not None:
        return float(finding.internal_risk_score)
    if finding.risk_score is not None:
        return float(finding.risk_score)
    return None


def display_risk_band(finding: models.ScoredFinding) -> str | None:
    return finding.internal_risk_band or finding.risk_band or finding.risk_rating


def normalize_risk_band(raw_band: str) -> str:
    candidate = raw_band.strip().lower()
    mapping = {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }
    normalized = mapping.get(candidate)
    if not normalized:
        raise HTTPException(
            status_code=400,
            detail="Invalid risk band. Use one of: Critical, High, Medium, Low.",
        )
    return normalized


def normalize_disposition(raw_disposition: str) -> str:
    candidate = (raw_disposition or "").strip().lower().replace(" ", "_")
    if candidate not in ALLOWED_DISPOSITIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid disposition. Use one of: none, ignored, risk_accepted, "
                "false_positive, not_applicable."
            ),
        )
    return candidate


def serialize_json(value: dict | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, sort_keys=True, default=str)


def record_finding_event(
    db: Session,
    *,
    finding: models.ScoredFinding,
    event_type: str,
    actor: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
    scan_run_id: int | None = None,
) -> None:
    finding_key = (
        finding.finding_key
        or f"{finding.source}:{finding.uid or finding.record_id or finding.id}"
    )
    db.add(
        models.FindingEvent(
            finding_key=finding_key,
            scored_finding_id=finding.id,
            scan_run_id=scan_run_id,
            event_type=event_type,
            event_at=datetime.utcnow(),
            old_value=serialize_json(old_value),
            new_value=serialize_json(new_value),
            actor=(actor or "system").strip() or "system",
            source=finding.source,
        )
    )


def resolve_sorting(sort_by: str, sort_order: str):
    sort_by_key = sort_by.strip().lower()
    sort_order_key = sort_order.strip().lower()

    sort_columns = {
        "risk_score": func.coalesce(
            models.ScoredFinding.internal_risk_score,
            models.ScoredFinding.risk_score,
        ),
        "internal_risk_score": func.coalesce(
            models.ScoredFinding.internal_risk_score,
            models.ScoredFinding.risk_score,
        ),
        "source_risk_score": models.ScoredFinding.risk_score,
        "cvss_score": models.ScoredFinding.cvss_score,
        "epss_score": models.ScoredFinding.epss_score,
        "age_in_days": models.ScoredFinding.age_in_days,
        "vuln_age_days": models.ScoredFinding.age_in_days,
        "due_date": models.ScoredFinding.due_date,
        "source": func.lower(func.coalesce(models.ScoredFinding.source, "")),
    }

    column = sort_columns.get(sort_by_key)
    if column is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sort_by. Use one of: risk_score, internal_risk_score, "
                "source_risk_score, cvss_score, epss_score, age_in_days, due_date, source."
            ),
        )

    if sort_order_key not in {"asc", "desc"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort_order. Use one of: asc, desc.",
        )

    primary = column.asc() if sort_order_key == "asc" else column.desc()
    if sort_by_key in {"age_in_days", "vuln_age_days", "due_date"}:
        primary = primary.nullslast()

    tie_breaker = models.ScoredFinding.id.desc()
    return primary, tie_breaker


def apply_source_filter(query, source: str | None):
    if source is None:
        return query

    normalized_source = source.strip()
    if not normalized_source:
        return query

    if normalized_source.lower() == "unknown":
        return query.filter(
            or_(
                models.ScoredFinding.source.is_(None),
                models.ScoredFinding.source == "",
                func.lower(models.ScoredFinding.source) == "unknown",
            )
        )

    return query.filter(models.ScoredFinding.source == normalized_source)


def asset_criticality_label_from_numeric(asset_criticality: int) -> str:
    mapping = {
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Critical",
    }
    return mapping.get(int(asset_criticality), "Medium")


def rescore_finding_in_place(
    finding: models.ScoredFinding,
    *,
    weights: dict,
) -> None:
    assessment = compute_risk_assessment(
        cvss_score=finding.cvss_score,
        epss_score=finding.epss_score,
        asset_criticality_label=asset_criticality_label_from_numeric(
            finding.asset_criticality or 2
        ),
        asset_criticality=int(finding.asset_criticality or 2),
        context_score=finding.context_score,
        is_kev=bool(getattr(finding, "is_kev", False)),
        weights=weights,
    )
    finding.internal_risk_score = assessment.risk_score
    finding.internal_risk_band = assessment.risk_band


def validate_risk_weights(payload: schemas.RiskWeightsConfig) -> None:
    non_negative_fields = {
        "cvss_weight": payload.cvss_weight,
        "epss_weight": payload.epss_weight,
        "kev_weight": payload.kev_weight,
        "asset_criticality_weight": payload.asset_criticality_weight,
        "context_weight": payload.context_weight,
    }
    for field_name, value in non_negative_fields.items():
        if value < 0:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} must be >= 0.",
            )
        if value > 1:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} must be <= 1.",
            )


def to_disposition_result(
    finding: models.ScoredFinding,
) -> schemas.FindingDispositionResult:
    return schemas.FindingDispositionResult(
        id=finding.id,
        uid=finding.uid,
        record_id=finding.record_id,
        disposition=finding.disposition or "none",
        disposition_state=finding.disposition_state,
        disposition_reason=finding.disposition_reason,
        disposition_comment=finding.disposition_comment,
        disposition_created_at=finding.disposition_created_at,
        disposition_expires_at=finding.disposition_expires_at,
        disposition_created_by=finding.disposition_created_by,
    )


def to_scored_finding_out(
    finding: models.ScoredFinding,
    *,
    cve_description: str | None = None,
) -> schemas.ScoredFindingOut:
    return schemas.ScoredFindingOut(
        id=finding.id,
        source=finding.source,
        uid=finding.uid,
        record_id=finding.record_id,
        display_name=finding.display_name,
        record_link=finding.record_link,
        status=finding.status,
        status_category=finding.status_category,
        source_status=finding.source_status,
        compliance_status=finding.compliance_status,
        severity=finding.severity,
        lifecycle_status=finding.lifecycle_status,
        age_in_days=finding.age_in_days,
        first_found=finding.first_found,
        last_found=finding.last_found,
        due_date=finding.due_date,
        fixed_at=finding.fixed_at,
        status_changed_at=finding.status_changed_at,
        cisa_due_date_expired=finding.cisa_due_date_expired,
        target_count=finding.target_count,
        target_ids=finding.target_ids,
        target_names=finding.target_names,
        cve_id=finding.cve_id,
        cve_ids=finding.cve_ids,
        cve_record_names=finding.cve_record_names,
        cwe_ids=finding.cwe_ids,
        cvss_score=finding.cvss_score,
        cvss_version=finding.cvss_version,
        cvss_severity=finding.cvss_severity,
        cvss_vector=finding.cvss_vector,
        attack_vector=finding.attack_vector,
        attack_complexity=finding.attack_complexity,
        epss_score=finding.epss_score,
        epss_percentile=finding.epss_percentile,
        is_kev=bool(finding.is_kev),
        kev_date_added=finding.kev_date_added,
        kev_due_date=finding.kev_due_date,
        kev_vendor_project=finding.kev_vendor_project,
        kev_product=finding.kev_product,
        kev_vulnerability_name=finding.kev_vulnerability_name,
        kev_short_description=finding.kev_short_description,
        kev_required_action=finding.kev_required_action,
        kev_ransomware_use=finding.kev_ransomware_use,
        risk_score=display_risk_score(finding),
        risk_band=display_risk_band(finding),
        source_risk_score=finding.risk_score,
        source_risk_band=finding.risk_band,
        source_risk_rating=finding.risk_rating,
        base_risk_score=finding.base_risk_score,
        internal_risk_score=finding.internal_risk_score,
        internal_risk_band=finding.internal_risk_band,
        internal_risk_notes=finding.internal_risk_notes,
        asset_criticality=finding.asset_criticality,
        context_score=finding.context_score,
        risk_factor_names=finding.risk_factor_names,
        risk_factor_values=finding.risk_factor_values,
        risk_factor_offset=finding.risk_factor_offset,
        summary=finding.summary,
        description=finding.description,
        cve_description=cve_description,
        type_display_name=finding.type_display_name,
        type_id=finding.type_id,
        attack_pattern_names=finding.attack_pattern_names,
        attack_technique_names=finding.attack_technique_names,
        attack_tactic_names=finding.attack_tactic_names,
        sla_days=finding.sla_days,
        sla_level=finding.sla_level,
        risk_owner_name=finding.risk_owner_name,
        remediation_owner_name=finding.remediation_owner_name,
        source_count=finding.source_count,
        source_uids=finding.source_uids,
        source_record_uids=finding.source_record_uids,
        source_links=finding.source_links,
        connector_names=finding.connector_names,
        source_connector_names=finding.source_connector_names,
        connector_categories=finding.connector_categories,
        data_integration_titles=finding.data_integration_titles,
        informed_user_names=finding.informed_user_names,
        data_model_name=finding.data_model_name,
        created_by=finding.created_by,
        updated_by=finding.updated_by,
        date_created=finding.date_created,
        last_updated=finding.last_updated,
        risk_scoring_model_name=finding.risk_scoring_model_name,
        sla_definition_name=finding.sla_definition_name,
        confidence=finding.confidence,
        category_count=finding.category_count,
        categories=finding.categories,
        remediation_summary=finding.remediation_summary,
        remediation_plan=finding.remediation_plan,
        remediation_notes=finding.remediation_notes,
        remediation_status=finding.remediation_status,
        remediation_due_date=finding.remediation_due_date,
        remediation_updated_at=finding.remediation_updated_at,
        remediation_updated_by=finding.remediation_updated_by,
        disposition=finding.disposition,
        disposition_state=finding.disposition_state,
        disposition_reason=finding.disposition_reason,
        disposition_comment=finding.disposition_comment,
        disposition_created_at=finding.disposition_created_at,
        disposition_expires_at=finding.disposition_expires_at,
        disposition_created_by=finding.disposition_created_by,
    )

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import case, func
from app import models, schemas
from app.services.brinqa_detail import DetailResult


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


def derive_risk_band(score: float | None) -> str | None:
    if score is None:
        return None
    if score >= 9:
        return "Critical"
    if score >= 7:
        return "High"
    if score >= 4:
        return "Medium"
    return "Low"


def finding_display_score(finding: models.Finding) -> float | None:
    return finding.crq_finding_score if finding.crq_finding_score is not None else finding.brinqa_risk_score


def finding_display_band(finding: models.Finding) -> str | None:
    if finding.crq_finding_risk_band:
        return finding.crq_finding_risk_band
    return derive_risk_band(finding_display_score(finding))


def finding_score_source(finding: models.Finding) -> str:
    if finding.crq_finding_score is not None:
        version = (finding.crq_finding_score_version or "v4").upper()
        return f"CRQ {version}"
    return "Brinqa"


def display_score_expression():
    return func.coalesce(models.Finding.crq_finding_score, models.Finding.brinqa_risk_score)


def display_band_expression():
    score = display_score_expression()
    return case(
        (score >= 9, 4),
        (score >= 7, 3),
        (score >= 4, 2),
        else_=1,
    )


def derive_lifecycle_status(status: str | None) -> str | None:
    if not status:
        return None
    normalized = status.strip().lower()
    if any(token in normalized for token in ("fixed", "closed", "resolved")):
        return "Fixed"
    if any(token in normalized for token in ("active", "open", "new")):
        return "Active"
    return status


def resolve_sorting(sort_by: str, sort_order: str):
    sort_by_key = sort_by.strip().lower()
    sort_order_key = sort_order.strip().lower()

    band_weight = display_band_expression()

    sort_columns = {
        "risk_score": display_score_expression(),
        "internal_risk_score": models.Finding.crq_finding_score,
        "source_risk_score": models.Finding.brinqa_risk_score,
        "cvss_score": models.Finding.crq_finding_cvss_score,
        "epss_score": models.Finding.crq_finding_epss_score,
        "age_in_days": models.Finding.age_in_days,
        "vuln_age_days": models.Finding.age_in_days,
        "due_date": models.Finding.last_updated,
        "source": func.lower(func.coalesce(models.Finding.finding_name, "")),
        "risk_band": band_weight,
        "status": func.lower(func.coalesce(models.Finding.status, "")),
    }

    column = sort_columns.get(sort_by_key)
    if column is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sort_by. Use one of: risk_score, internal_risk_score, "
                "source_risk_score, cvss_score, epss_score, age_in_days, due_date, source, status."
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
    tie_breaker = models.Finding.id.desc()
    return primary, tie_breaker


def summary_band_filter(normalized_band: str):
    score = display_score_expression()
    if normalized_band == "Critical":
        return score >= 9
    if normalized_band == "High":
        return (score >= 7) & (score < 9)
    if normalized_band == "Medium":
        return (score >= 4) & (score < 7)
    return score < 4


def to_finding_summary(
    finding: models.Finding,
    *,
    target_name: str | None = None,
) -> schemas.FindingSummary:
    asset = finding.asset
    risk_score = finding_display_score(finding)
    risk_band = finding_display_band(finding)
    resolved_target_name = target_name if target_name is not None else (asset.hostname if asset else None)
    return schemas.FindingSummary(
        id=finding.finding_id,
        source="Brinqa",
        asset_id=finding.asset_id,
        uid=finding.finding_uid,
        record_id=finding.finding_id,
        display_name=finding.finding_name,
        status=finding.status,
        compliance_status=None,
        lifecycle_status=derive_lifecycle_status(finding.status),
        age_in_days=finding.age_in_days,
        first_found=finding.first_found,
        last_found=finding.last_found,
        cve_id=finding.cve_id,
        target_ids=finding.asset_id,
        target_names=resolved_target_name,
        cvss_score=finding.crq_finding_cvss_score,
        cvss_severity=None,
        epss_score=finding.crq_finding_epss_score,
        epss_percentile=finding.crq_finding_epss_percentile,
        is_kev=bool(finding.crq_finding_is_kev),
        risk_score=risk_score,
        risk_band=risk_band,
        source_risk_score=finding.brinqa_risk_score,
        source_risk_band=derive_risk_band(finding.brinqa_risk_score),
        source_risk_rating=derive_risk_band(finding.brinqa_risk_score),
        base_risk_score=finding.brinqa_base_risk_score,
        score_source=finding_score_source(finding),
        crq_score_version=finding.crq_finding_score_version,
        crq_scored_at=finding.crq_finding_scored_at,
        asset_criticality=None,
    )


def _parse_datetime(value) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def to_finding_detail(
    finding: models.Finding,
    *,
    detail: DetailResult | None = None,
) -> schemas.FindingDetail:
    summary = to_finding_summary(finding)
    asset = finding.asset
    payload = (detail.payload or {}) if detail else {}
    return schemas.FindingDetail(
        **summary.model_dump(
            exclude={
                "cvss_score",
                "cvss_severity",
                "epss_score",
                "epss_percentile",
                "is_kev",
            }
        ),
        asset_name=asset.hostname if asset else None,
        summary=payload.get("summary"),
        description=payload.get("description"),
        record_link=payload.get("record_link"),
        source_status=payload.get("source_status"),
        severity=payload.get("severity"),
        due_date=_parse_datetime(payload.get("due_date")),
        cvss_score=finding.crq_finding_cvss_score,
        cvss_version=payload.get("cvss_version"),
        cvss_severity=summary.cvss_severity,
        cvss_vector=payload.get("cvss_vector"),
        attack_vector=payload.get("attack_vector"),
        attack_complexity=payload.get("attack_complexity"),
        epss_score=finding.crq_finding_epss_score,
        epss_percentile=finding.crq_finding_epss_percentile,
        is_kev=bool(finding.crq_finding_is_kev),
        crq_cvss_score=finding.crq_finding_cvss_score,
        crq_epss_score=finding.crq_finding_epss_score,
        crq_epss_percentile=finding.crq_finding_epss_percentile,
        crq_epss_multiplier=finding.crq_finding_epss_multiplier,
        crq_is_kev=bool(finding.crq_finding_is_kev),
        crq_kev_bonus=finding.crq_finding_kev_bonus,
        crq_age_days=finding.crq_finding_age_days,
        crq_age_bonus=finding.crq_finding_age_bonus,
        crq_notes=finding.crq_finding_notes,
        kev_date_added=_parse_datetime(payload.get("kev_date_added")),
        kev_due_date=_parse_datetime(payload.get("kev_due_date")),
        kev_vendor_project=payload.get("kev_vendor_project"),
        kev_product=payload.get("kev_product"),
        kev_vulnerability_name=payload.get("kev_vulnerability_name"),
        kev_short_description=payload.get("kev_short_description"),
        kev_required_action=payload.get("kev_required_action"),
        kev_ransomware_use=payload.get("kev_ransomware_use"),
        cve_description=payload.get("cve_description"),
        attack_pattern_names=payload.get("attack_pattern_names"),
        attack_technique_names=payload.get("attack_technique_names"),
        attack_tactic_names=payload.get("attack_tactic_names"),
        risk_owner_name=payload.get("risk_owner_name"),
        remediation_owner_name=payload.get("remediation_owner_name"),
        remediation_status=payload.get("remediation_status"),
        internal_risk_notes=payload.get("internal_risk_notes"),
        detail_source=detail.source if detail else None,
        detail_fetched_at=detail.fetched_at if detail else None,
    )


def slugify(value: str) -> str:
    normalized = "".join(char.lower() if char.isalnum() else "-" for char in value.strip())
    parts = [part for part in normalized.split("-") if part]
    return "-".join(parts)


def to_asset_summary(asset: models.Asset, finding_count: int = 0) -> schemas.AssetSummary:
    company = asset.__dict__.get("company")
    business_unit = asset.__dict__.get("business_unit")
    business_service_rel = asset.__dict__.get("business_service_rel")
    application_rel = asset.__dict__.get("application_rel")

    company_name = company.name if company else None
    business_unit_name = business_unit.name if business_unit else None
    business_service_name = (
        business_service_rel.name if business_service_rel else asset.business_service
    )
    application_name = application_rel.name if application_rel else asset.application
    return schemas.AssetSummary(
        asset_id=asset.asset_id,
        hostname=asset.hostname,
        company=company_name,
        business_unit=business_unit_name,
        application=application_name,
        business_service=business_service_name,
        status=asset.status,
        compliance_status=None,
        asset_criticality=None,
        tags=list(asset.tags) if asset.tags else None,
        environment=asset.environment,
        aggregated_finding_risk=asset.crq_asset_aggregated_finding_risk,
        exposure_score=asset.crq_asset_exposure_score,
        data_sensitivity_score=asset.crq_asset_data_sensitivity_score,
        environment_score=asset.crq_asset_environment_score,
        asset_type_score=asset.crq_asset_type_score,
        asset_context_score=asset.crq_asset_context_score,
        asset_risk_score=asset.crq_asset_risk_score,
        scored_at=asset.crq_asset_scored_at,
        finding_count=finding_count,
    )


def to_asset_detail(
    asset: models.Asset,
    *,
    finding_count: int = 0,
    detail: DetailResult | None = None,
) -> schemas.AssetDetail:
    payload = (detail.payload or {}) if detail else {}
    return schemas.AssetDetail(
        **to_asset_summary(asset, finding_count=finding_count).model_dump(),
        uid=payload.get("uid"),
        dnsname=payload.get("dnsname"),
        uuid=payload.get("uuid"),
        tracking_method=payload.get("tracking_method"),
        owner=payload.get("owner"),
        service_team=payload.get("service_team"),
        division=payload.get("division"),
        it_sme=payload.get("it_sme"),
        it_director=payload.get("it_director"),
        location=payload.get("location"),
        internal_or_external=payload.get("internal_or_external") or asset.internal_or_external,
        device_type=payload.get("device_type") or asset.device_type,
        category=payload.get("category") or asset.category,
        virtual_or_physical=payload.get("virtual_or_physical"),
        compliance_flags=asset.compliance_flags,
        pci=asset.pci,
        pii=asset.pii,
        public_ip_addresses=payload.get("public_ip_addresses") or asset.public_ip_addresses,
        private_ip_addresses=payload.get("private_ip_addresses"),
        last_authenticated_scan=_parse_datetime(payload.get("last_authenticated_scan")),
        last_scanned=_parse_datetime(payload.get("last_scanned")),
        qualys_vm_host_id=asset.qualys_vm_host_id,
        qualys_vm_host_uid=asset.qualys_vm_host_uid,
        qualys_vm_host_link=asset.qualys_vm_host_link,
        qualys_vm_host_integration=asset.qualys_vm_host_integration,
        servicenow_host_id=asset.servicenow_host_id,
        servicenow_host_uid=asset.servicenow_host_uid,
        servicenow_host_link=asset.servicenow_host_link,
        servicenow_host_integration=asset.servicenow_host_integration,
        detail_source=detail.source if detail else None,
        detail_fetched_at=detail.fetched_at if detail else None,
    )


def to_asset_enrichment(
    asset: models.Asset,
    *,
    detail: DetailResult,
    status: str,
    reason: str,
) -> schemas.AssetEnrichment:
    payload = detail.payload or {}
    return schemas.AssetEnrichment(
        asset_id=asset.asset_id,
        status=status,
        reason=reason,
        uid=payload.get("uid"),
        dnsname=payload.get("dnsname"),
        mac_addresses=payload.get("mac_addresses"),
        uuid=payload.get("uuid"),
        tracking_method=payload.get("tracking_method"),
        owner=payload.get("owner"),
        service_team=payload.get("service_team"),
        division=payload.get("division"),
        it_sme=payload.get("it_sme"),
        it_director=payload.get("it_director"),
        location=payload.get("location"),
        internal_or_external=payload.get("internal_or_external"),
        device_type=payload.get("device_type"),
        category=payload.get("category"),
        virtual_or_physical=payload.get("virtual_or_physical"),
        compliance_flags=payload.get("compliance_flags"),
        pci=payload.get("pci"),
        pii=payload.get("pii"),
        last_authenticated_scan=_parse_datetime(payload.get("last_authenticated_scan")),
        last_scanned=_parse_datetime(payload.get("last_scanned")),
        detail_source=detail.source,
        detail_fetched_at=detail.fetched_at,
    )

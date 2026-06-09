from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import case, func

from app import models, schemas


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
        business_service=asset.business_service if asset else None,
        application=asset.application if asset else None,
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


def parse_datetime(value) -> datetime | None:
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
    detail=None,
    nvd: models.NvdRecord | None = None,
    kev: models.KevRecord | None = None,
) -> schemas.FindingDetail:
    summary = to_finding_summary(finding)
    asset = finding.asset
    payload = (detail.payload or {}) if detail else {}
    nvd_description = nvd.description if nvd and nvd.description else None
    nvd_cvss_score = nvd.cvss_score if nvd and nvd.cvss_score is not None else None
    nvd_cvss_severity = nvd.cvss_severity if nvd and nvd.cvss_severity else None
    nvd_cvss_version = nvd.cvss_version if nvd and nvd.cvss_version else None
    nvd_cvss_vector = nvd.cvss_vector if nvd and nvd.cvss_vector else None
    nvd_attack_vector = nvd.attack_vector if nvd and nvd.attack_vector else None
    nvd_attack_complexity = nvd.attack_complexity if nvd and nvd.attack_complexity else None
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
        due_date=parse_datetime(payload.get("due_date")),
        cvss_score=(
            finding.crq_finding_cvss_score
            if finding.crq_finding_cvss_score is not None
            else nvd_cvss_score
        ),
        cvss_version=payload.get("cvss_version") or nvd_cvss_version,
        cvss_severity=summary.cvss_severity or nvd_cvss_severity,
        cvss_vector=payload.get("cvss_vector") or nvd_cvss_vector,
        cvss_exploitability_score=nvd.cvss_exploitability_score if nvd else None,
        cvss_impact_score=nvd.cvss_impact_score if nvd else None,
        attack_vector=payload.get("attack_vector") or nvd_attack_vector,
        attack_complexity=payload.get("attack_complexity") or nvd_attack_complexity,
        privileges_required=nvd.privileges_required if nvd else None,
        user_interaction=nvd.user_interaction if nvd else None,
        scope=nvd.scope if nvd else None,
        confidentiality_impact=nvd.confidentiality_impact if nvd else None,
        integrity_impact=nvd.integrity_impact if nvd else None,
        availability_impact=nvd.availability_impact if nvd else None,
        epss_score=finding.crq_finding_epss_score,
        epss_percentile=finding.crq_finding_epss_percentile,
        is_kev=bool(finding.crq_finding_is_kev) or kev is not None,
        crq_cvss_score=finding.crq_finding_cvss_score,
        crq_epss_score=finding.crq_finding_epss_score,
        crq_epss_percentile=finding.crq_finding_epss_percentile,
        crq_epss_multiplier=finding.crq_finding_epss_multiplier,
        crq_is_kev=bool(finding.crq_finding_is_kev),
        crq_kev_bonus=finding.crq_finding_kev_bonus,
        crq_age_days=finding.crq_finding_age_days,
        crq_age_bonus=finding.crq_finding_age_bonus,
        crq_notes=finding.crq_finding_notes,
        kev_date_added=parse_datetime(
            payload.get("kev_date_added") or (kev.date_added if kev else None)
        ),
        kev_due_date=parse_datetime(
            payload.get("kev_due_date") or (kev.due_date if kev else None)
        ),
        kev_vendor_project=payload.get("kev_vendor_project") or (kev.vendor_project if kev else None),
        kev_product=payload.get("kev_product") or (kev.product if kev else None),
        kev_vulnerability_name=(
            payload.get("kev_vulnerability_name") or (kev.vulnerability_name if kev else None)
        ),
        kev_short_description=payload.get("kev_short_description") or (
            kev.short_description if kev else None
        ),
        kev_required_action=payload.get("kev_required_action") or (
            nvd.cisa_required_action if nvd else None
        ),
        kev_ransomware_use=payload.get("kev_ransomware_use"),
        cve_description=nvd_description or payload.get("cve_description"),
        nvd_vuln_status=nvd.vuln_status if nvd else None,
        nvd_published=parse_datetime(nvd.published if nvd else None),
        nvd_last_modified=parse_datetime(nvd.last_modified if nvd else None),
        primary_cwe_id=nvd.primary_cwe_id if nvd else None,
        primary_cwe_description=nvd.primary_cwe_description if nvd else None,
        weaknesses=nvd.weaknesses if nvd and nvd.weaknesses else None,
        affected_products=nvd.affected_products if nvd and nvd.affected_products else None,
        references=nvd.references if nvd and nvd.references else None,
        reference_groups=nvd.reference_groups if nvd and nvd.reference_groups else None,
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


def to_application_summary(
    application: models.Application,
    *,
    asset_count: int | None = None,
    finding_count: int | None = None,
) -> schemas.ApplicationSummary:
    resolved_asset_count = (
        application.crq_application_asset_count
        if application.crq_application_asset_count is not None
        else asset_count
    )
    resolved_finding_count = (
        application.crq_application_finding_count
        if application.crq_application_finding_count is not None
        else finding_count
    )
    return schemas.ApplicationSummary(
        application=application.name,
        slug=application.slug,
        description=application.description,
        tags=list(application.tags) if application.tags is not None else None,
        metrics=schemas.TopologyMetrics(
            total_assets=int(resolved_asset_count or 0),
            total_findings=int(resolved_finding_count or 0),
        ),
        aggregated_asset_risk=application.crq_application_aggregated_asset_risk,
        compliance_score=application.crq_application_compliance_score,
        application_risk_score=application.crq_application_risk_score,
        scored_at=application.crq_application_scored_at,
    )


def to_asset_summary(asset: models.Asset, finding_count: int | None = None) -> schemas.AssetSummary:
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
    resolved_finding_count = (
        asset.crq_asset_finding_count
        if finding_count is None and asset.crq_asset_finding_count is not None
        else finding_count
    )
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
        device_type=asset.device_type,
        category=asset.category,
        compliance_flags=asset.compliance_flags,
        pci=asset.pci,
        pii=asset.pii,
        finding_count=int(resolved_finding_count or 0),
    )


def to_asset_detail(
    asset: models.Asset,
    *,
    finding_count: int | None = None,
    detail=None,
) -> schemas.AssetDetail:
    payload = (detail.payload or {}) if detail else {}
    return schemas.AssetDetail(
        **to_asset_summary(asset, finding_count=finding_count).model_dump(
            exclude={"device_type", "category", "compliance_flags", "pci", "pii"}
        ),
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
        last_authenticated_scan=parse_datetime(payload.get("last_authenticated_scan")),
        last_scanned=parse_datetime(payload.get("last_scanned")),
        qualys_vm_host_id=asset.qualys_vm_host_id,
        qualys_vm_host_link=asset.qualys_vm_host_link,
        servicenow_host_id=asset.servicenow_host_id,
        servicenow_host_link=asset.servicenow_host_link,
        detail_source=detail.source if detail else None,
        detail_fetched_at=detail.fetched_at if detail else None,
    )

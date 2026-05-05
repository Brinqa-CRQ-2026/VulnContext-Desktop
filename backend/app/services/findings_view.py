from __future__ import annotations

from fastapi import HTTPException

from app import schemas
from app.api.common import (
    _parse_datetime,
    derive_risk_band,
    normalize_risk_band,
    resolve_sorting,
    summary_band_filter,
    to_finding_detail,
    to_finding_summary,
)
from app.repositories import findings as findings_repo
from app.services.brinqa_detail import finding_detail_service


def list_top_findings(db) -> list[schemas.FindingSummary]:
    findings = findings_repo.top_findings_query(db).limit(10).all()
    return [to_finding_summary(finding) for finding in findings]


def get_findings_summary(db) -> schemas.ScoresSummary:
    findings = findings_repo.finding_summary_rows(db).all()
    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    kev_band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    kev_total = 0
    for _, crq_finding_score, brinqa_risk_score, crq_finding_is_kev in findings:
        score = crq_finding_score if crq_finding_score is not None else brinqa_risk_score
        band = derive_risk_band(score)
        if band in band_counts:
            band_counts[band] += 1
            if crq_finding_is_kev:
                kev_band_counts[band] += 1
        if crq_finding_is_kev:
            kev_total += 1

    return schemas.ScoresSummary(
        total_findings=len(findings),
        risk_bands=schemas.RiskBandSummary(**band_counts),
        kev_findings_total=kev_total,
        kev_risk_bands=schemas.RiskBandSummary(**kev_band_counts),
    )


def list_findings(
    db,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
    source: str | None,
    risk_band: str | None,
) -> schemas.PaginatedFindings:
    sort_primary, sort_tie_breaker = resolve_sorting(sort_by, sort_order)
    query = findings_repo.findings_query(db, include_asset=True)
    count_query = findings_repo.findings_count_query(db)

    if source is not None and source.strip() and source.strip().lower() != "brinqa":
        return schemas.PaginatedFindings(items=[], total=0, page=page, page_size=page_size)

    if risk_band is not None:
        band_filter = summary_band_filter(normalize_risk_band(risk_band))
        query = query.filter(band_filter)
        count_query = count_query.filter(band_filter)

    total = count_query.scalar() or 0
    if total == 0:
        return schemas.PaginatedFindings(items=[], total=0, page=page, page_size=page_size)

    offset = (page - 1) * page_size
    findings = (
        query.order_by(sort_primary, sort_tie_breaker)
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return schemas.PaginatedFindings(
        items=[to_finding_summary(finding) for finding in findings],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_finding_detail(db, finding_id: str) -> schemas.FindingDetail:
    finding = findings_repo.get_finding_by_id(db, finding_id, include_asset=True)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    return to_finding_detail(finding, detail=None)


def get_finding_enrichment(db, finding_id: str) -> schemas.FindingEnrichment:
    finding = findings_repo.get_finding_by_id(db, finding_id)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    detail = finding_detail_service.get_detail(db, finding)
    payload = detail.payload or {}
    return schemas.FindingEnrichment(
        finding_id=finding.finding_id,
        summary=payload.get("summary"),
        description=payload.get("description"),
        record_link=payload.get("record_link"),
        source_status=payload.get("source_status"),
        severity=payload.get("severity"),
        due_date=_parse_datetime(payload.get("due_date")),
        attack_pattern_names=payload.get("attack_pattern_names"),
        attack_technique_names=payload.get("attack_technique_names"),
        attack_tactic_names=payload.get("attack_tactic_names"),
        risk_owner_name=payload.get("risk_owner_name"),
        remediation_owner_name=payload.get("remediation_owner_name"),
        remediation_status=payload.get("remediation_status"),
        detail_source=detail.source,
        detail_fetched_at=detail.fetched_at,
    )

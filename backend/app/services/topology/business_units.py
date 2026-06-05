from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app import models, schemas
from app.repositories.topology import (
    business_services_for_unit,
    business_unit_by_slug,
    findings_for_business_unit,
)
from app.services.topology.shared import (
    _build_asset_score_distribution,
    _company_summary,
    _require_topology_schema,
)
from app.services.views.helpers import (
    derive_risk_band,
    finding_display_score,
    normalize_risk_band,
    resolve_sorting,
    summary_band_filter,
    to_finding_summary,
)


def get_business_units(db):
    _require_topology_schema(db)
    business_units = (
        db.query(models.BusinessUnit)
        .options(joinedload(models.BusinessUnit.company))
        .order_by(func.lower(models.BusinessUnit.name))
        .all()
    )

    return [
        schemas.BusinessUnitSummary(
            company=_company_summary(business_unit.company),
            business_unit=business_unit.name,
            slug=business_unit.slug,
            description=business_unit.description,
            metrics=schemas.TopologyMetrics(
                total_business_services=int(business_unit.crq_business_unit_business_service_count or 0),
                total_applications=int(business_unit.crq_business_unit_application_count or 0),
                total_assets=int(business_unit.crq_business_unit_asset_count or 0),
                total_findings=int(business_unit.crq_business_unit_finding_count or 0),
            ),
            risk_score=business_unit.crq_business_unit_risk_score,
            risk_band=derive_risk_band(business_unit.crq_business_unit_risk_score),
            priority_score=business_unit.crq_business_unit_priority_score,
            risk_trend=None,
        )
        for business_unit in business_units
    ]


def get_business_unit_detail(business_unit_slug: str, db):
    _require_topology_schema(db)
    business_unit = business_unit_by_slug(db, business_unit_slug)
    if business_unit is None:
        raise HTTPException(status_code=404, detail="Business unit not found.")

    business_services = business_services_for_unit(db, business_unit.id)

    return schemas.BusinessUnitDetail(
        company=_company_summary(business_unit.company),
        business_unit=business_unit.name,
        slug=business_unit.slug,
        source_id=business_unit.source_id,
        description=business_unit.description,
        owner=business_unit.owner,
        risk_score=business_unit.crq_business_unit_risk_score,
        risk_band=derive_risk_band(business_unit.crq_business_unit_risk_score),
        priority_score=business_unit.crq_business_unit_priority_score,
        metrics=schemas.TopologyMetrics(
            total_business_services=int(business_unit.crq_business_unit_business_service_count or 0),
            total_applications=int(business_unit.crq_business_unit_application_count or 0),
            total_assets=int(business_unit.crq_business_unit_asset_count or 0),
            total_findings=int(business_unit.crq_business_unit_finding_count or 0),
        ),
        business_services=[
            schemas.BusinessServiceSummary(
                business_service=service.name,
                slug=service.slug,
                metrics=schemas.TopologyMetrics(
                    total_applications=int(service.crq_business_service_application_count or 0),
                    total_assets=int(service.crq_business_service_asset_count or 0),
                    total_findings=int(service.crq_business_service_finding_count or 0),
                ),
                risk_score=service.crq_business_service_risk_score,
                risk_band=derive_risk_band(service.crq_business_service_risk_score),
                priority_score=service.crq_business_service_priority_score,
                business_criticality_score=service.business_criticality_score,
            )
            for service in business_services
        ],
    )


def get_business_unit_risk_overview(business_unit_slug: str, db):
    _require_topology_schema(db)
    business_unit = business_unit_by_slug(db, business_unit_slug)
    if business_unit is None:
        raise HTTPException(status_code=404, detail="Business unit not found.")

    findings = findings_for_business_unit(db, business_unit.id, include_asset=True).all()
    scores: list[float] = []
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    trend_points = _build_business_unit_risk_trend(findings)

    for finding in findings:
        score = finding_display_score(finding)
        if score is None:
            continue
        scores.append(score)
        band = derive_risk_band(score)
        if band in severity_counts:
            severity_counts[band] += 1

    risk_score = (
        business_unit.crq_business_unit_risk_score
        if business_unit.crq_business_unit_risk_score is not None
        else round(sum(scores) / len(scores), 2) if scores else None
    )

    return schemas.BusinessUnitRiskOverview(
        business_unit=business_unit.name,
        slug=business_unit.slug,
        risk_score=risk_score,
        risk_band=derive_risk_band(risk_score),
        priority_score=business_unit.crq_business_unit_priority_score,
        risk_trend=trend_points,
        severity_counts=schemas.RiskBandSummary(**severity_counts),
        finding_risk_distribution=_build_asset_score_distribution(scores),
    )


def get_business_unit_findings(
    business_unit_slug: str,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_order: str,
    source: str | None,
    risk_band: str | None,
    search: str | None,
    db,
):
    _require_topology_schema(db)
    business_unit = business_unit_by_slug(db, business_unit_slug)
    if business_unit is None:
        raise HTTPException(status_code=404, detail="Business unit not found.")

    if source is not None and source.strip() and source.strip().lower() != "brinqa":
        return schemas.PaginatedFindings(items=[], total=0, page=page, page_size=page_size)

    sort_primary, sort_tie_breaker = resolve_sorting(sort_by, sort_order)
    query = findings_for_business_unit(db, business_unit.id, include_asset=True)
    count_query = db.query(func.count(models.Finding.id)).join(
        models.Asset, models.Finding.asset_id == models.Asset.asset_id
    )
    count_query = count_query.filter(models.Asset.business_unit_id == business_unit.id)

    if risk_band is not None:
        band_filter = summary_band_filter(normalize_risk_band(risk_band))
        query = query.filter(band_filter)
        count_query = count_query.filter(band_filter)

    if search is not None and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Finding.finding_name.ilike(term),
                models.Finding.cve_id.ilike(term),
                models.Finding.finding_id.ilike(term),
            )
        )
        count_query = count_query.filter(
            or_(
                models.Finding.finding_name.ilike(term),
                models.Finding.cve_id.ilike(term),
                models.Finding.finding_id.ilike(term),
            )
        )

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


def _month_start(value: datetime) -> datetime:
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _shift_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return value.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


def _build_business_unit_risk_trend(findings: list[models.Finding]) -> list[schemas.BusinessUnitRiskTrendPoint]:
    dated_findings: list[tuple[datetime, float]] = []
    for finding in findings:
        score = finding_display_score(finding)
        if score is None:
            continue
        timestamp = finding.last_found or finding.first_found or finding.date_created or finding.last_updated
        if timestamp is None:
            continue
        dated_findings.append((timestamp, score))

    if not dated_findings:
        return []

    latest_month = _month_start(max(timestamp for timestamp, _ in dated_findings))
    by_month: dict[str, list[float]] = defaultdict(list)
    for timestamp, score in dated_findings:
        by_month[_month_start(timestamp).strftime("%b %Y")].append(score)

    trend: list[schemas.BusinessUnitRiskTrendPoint] = []
    for offset in range(-5, 1):
        month = _shift_months(latest_month, offset)
        label = month.strftime("%b %Y")
        month_scores = by_month.get(label, [])
        average = round(sum(month_scores) / len(month_scores), 2) if month_scores else 0.0
        trend.append(schemas.BusinessUnitRiskTrendPoint(period=label, score=average))

    return trend

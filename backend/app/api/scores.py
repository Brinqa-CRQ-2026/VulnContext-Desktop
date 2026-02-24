import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app import models, schemas
from app.core.db import get_db
from app.core.risk_weights import get_or_create_scoring_config, weights_from_config
from app.scoring import score_finding_dict, compute_risk_assessment
from app.seed import parse_qualys_csv_to_scored_findings, load_kev_catalog_from_env
from app.services.kev_enrichment import kev_record_for_cve, load_kev_catalog

router = APIRouter(
    prefix="/scores",
    tags=["scores"],
)

ALLOWED_LIFECYCLE_STATUSES = {"new", "active", "fixed", "reopened"}
ALLOWED_DISPOSITIONS = {
    "none",
    "ignored",
    "risk_accepted",
    "false_positive",
    "not_applicable",
}

def _normalize_risk_band(raw_band: str) -> str:
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


def _normalize_disposition(raw_disposition: str) -> str:
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


def _serialize_json(value: dict | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, sort_keys=True, default=str)


def _record_finding_event(
    db: Session,
    *,
    finding: models.ScoredFinding,
    event_type: str,
    actor: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
    scan_run_id: int | None = None,
) -> None:
    finding_key = finding.finding_key or f"{finding.source}:{finding.asset_id}:{finding.finding_id}"
    db.add(
        models.FindingEvent(
            finding_key=finding_key,
            scored_finding_id=finding.id,
            scan_run_id=scan_run_id,
            event_type=event_type,
            event_at=datetime.utcnow(),
            old_value=_serialize_json(old_value),
            new_value=_serialize_json(new_value),
            actor=(actor or "system").strip() or "system",
            source=finding.source,
        )
    )


def _resolve_sorting(sort_by: str, sort_order: str):
    sort_by_key = sort_by.strip().lower()
    sort_order_key = sort_order.strip().lower()

    sort_columns = {
        "risk_score": models.ScoredFinding.risk_score,
        "cvss_score": models.ScoredFinding.cvss_score,
        "epss_score": models.ScoredFinding.epss_score,
        "vuln_age_days": models.ScoredFinding.vuln_age_days,
        "source": func.lower(func.coalesce(models.ScoredFinding.source, "")),
    }

    column = sort_columns.get(sort_by_key)
    if column is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort_by. Use one of: risk_score, cvss_score, epss_score, vuln_age_days, source.",
        )

    if sort_order_key not in {"asc", "desc"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort_order. Use one of: asc, desc.",
        )

    primary = column.asc() if sort_order_key == "asc" else column.desc()
    if sort_by_key == "vuln_age_days":
        primary = primary.nullslast()

    tie_breaker = models.ScoredFinding.id.desc()
    return primary, tie_breaker


def _apply_source_filter(query, source: str | None):
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


def _asset_criticality_label_from_numeric(asset_criticality: int) -> str:
    mapping = {
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Critical",
    }
    return mapping.get(int(asset_criticality), "Medium")


def _rescore_finding_in_place(
    finding: models.ScoredFinding,
    *,
    weights: dict,
) -> None:
    assessment = compute_risk_assessment(
        cvss_score=finding.cvss_score,
        epss_score=finding.epss_score,
        internet_exposed=bool(finding.internet_exposed),
        asset_criticality_label=_asset_criticality_label_from_numeric(finding.asset_criticality),
        asset_criticality=int(finding.asset_criticality or 2),
        vuln_age_days=int(finding.vuln_age_days or 0),
        auth_required=bool(finding.auth_required),
        is_kev=bool(getattr(finding, "is_kev", False)),
        weights=weights,
    )
    finding.risk_score = assessment.risk_score
    finding.risk_band = assessment.risk_band
    finding.sla_hours = assessment.sla_hours


def _validate_risk_weights(payload: schemas.RiskWeightsConfig) -> None:
    non_negative_fields = {
        "cvss_weight": payload.cvss_weight,
        "epss_weight": payload.epss_weight,
        "internet_exposed_weight": payload.internet_exposed_weight,
        "asset_criticality_weight": payload.asset_criticality_weight,
        "vuln_age_weight": payload.vuln_age_weight,
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

    if payload.auth_required_weight > 0:
        raise HTTPException(
            status_code=400,
            detail="auth_required_weight must be <= 0.",
        )
    if payload.auth_required_weight < -1:
        raise HTTPException(
            status_code=400,
            detail="auth_required_weight must be >= -1.",
        )

    non_negative_sum = (
        payload.cvss_weight
        + payload.epss_weight
        + payload.internet_exposed_weight
        + payload.asset_criticality_weight
        + payload.vuln_age_weight
    )
    if abs(non_negative_sum - 1.0) > 0.001:
        raise HTTPException(
            status_code=400,
            detail="Positive weights must sum to 1.0.",
        )


def _to_disposition_result(finding: models.ScoredFinding) -> schemas.FindingDispositionResult:
    return schemas.FindingDispositionResult(
        id=finding.id,
        finding_id=finding.finding_id,
        disposition=finding.disposition or "none",
        disposition_state=finding.disposition_state,
        disposition_reason=finding.disposition_reason,
        disposition_comment=finding.disposition_comment,
        disposition_created_at=finding.disposition_created_at,
        disposition_expires_at=finding.disposition_expires_at,
        disposition_created_by=finding.disposition_created_by,
    )


@router.get("/health", summary="Health check for scores API")
def health_check():
    return {"status": "ok"}


@router.get("/", response_model=List[schemas.ScoredFindingOut])
def get_scores(db: Session = Depends(get_db)):
    """
    Return ALL scored findings currently stored in the database.
    """
    findings = db.query(models.ScoredFinding).all()
    return findings


@router.get("/top10", response_model=List[schemas.ScoredFindingOut])
def get_top_10_scores(db: Session = Depends(get_db)):
    """
    Return the top 10 findings by risk_score (descending).

    This maps directly to the "Top 10 by Context-Aware Risk" table
    in the frontend dashboard.
    """
    findings = (
        db.query(models.ScoredFinding)
        .order_by(models.ScoredFinding.risk_score.desc())
        .limit(10)
        .all()
    )
    return findings


@router.post("/", response_model=schemas.ScoredFindingOut)
def create_scored_finding(
    finding_in: schemas.ScoredFindingCreate,
    db: Session = Depends(get_db),
):
    """
    Score a single finding and persist it.

    Flow:
    - Take raw finding fields (no risk_score/band).
    - Compute risk_score + risk_band via score_finding_dict.
    - Insert into SQLite.
    - Return the created row.
    """
    config = get_or_create_scoring_config(db)
    scored_dict = score_finding_dict(
        finding_in.dict(),
        weights=weights_from_config(config),
    )

    db_obj = models.ScoredFinding(**scored_dict)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return db_obj

@router.get("/summary", response_model=schemas.ScoresSummary)
def get_scores_summary(db: Session = Depends(get_db)):
    """
    Summary statistics over *all* scored findings:
      - total number of findings
      - counts by risk band (Critical/High/Medium/Low)
    """
    total = db.query(func.count(models.ScoredFinding.id)).scalar() or 0

    rows = (
        db.query(models.ScoredFinding.risk_band, func.count(models.ScoredFinding.id))
        .group_by(models.ScoredFinding.risk_band)
        .all()
    )
    kev_rows = (
        db.query(models.ScoredFinding.risk_band, func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.is_kev.is_(True))
        .group_by(models.ScoredFinding.risk_band)
        .all()
    )
    kev_total = (
        db.query(func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.is_kev.is_(True))
        .scalar()
        or 0
    )

    band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for band, count in rows:
        if band in band_counts:
            band_counts[band] = count
    kev_band_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for band, count in kev_rows:
        if band in kev_band_counts:
            kev_band_counts[band] = count

    return schemas.ScoresSummary(
        total_findings=total,
        risk_bands=schemas.RiskBandSummary(
            Critical=band_counts["Critical"],
            High=band_counts["High"],
            Medium=band_counts["Medium"],
            Low=band_counts["Low"],
        ),
        kev_findings_total=int(kev_total),
        kev_risk_bands=schemas.RiskBandSummary(
            Critical=kev_band_counts["Critical"],
            High=kev_band_counts["High"],
            Medium=kev_band_counts["Medium"],
            Low=kev_band_counts["Low"],
        ),
    )

@router.get("/all", response_model=schemas.PaginatedFindings)
def get_all_scores(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    source: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return all scored findings, paginated and sorted by risk_score DESC.
    """

    sort_primary, sort_tie_breaker = _resolve_sorting(sort_by, sort_order)
    count_query = db.query(func.count(models.ScoredFinding.id))
    total = _apply_source_filter(count_query, source).scalar() or 0

    # If there are no rows, return empty page 1
    if total == 0:
        return schemas.PaginatedFindings(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    offset = (page - 1) * page_size

    items_query = _apply_source_filter(db.query(models.ScoredFinding), source)
    items = (
        items_query.order_by(sort_primary, sort_tie_breaker)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return schemas.PaginatedFindings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/weights", response_model=schemas.RiskWeightsConfig)
def get_risk_weights(db: Session = Depends(get_db)):
    config = get_or_create_scoring_config(db)
    return schemas.RiskWeightsConfig(**weights_from_config(config))


@router.put("/weights", response_model=schemas.RiskWeightsUpdateResult)
def update_risk_weights(
    payload: schemas.RiskWeightsConfig,
    db: Session = Depends(get_db),
):
    _validate_risk_weights(payload)
    config = get_or_create_scoring_config(db)

    config.cvss_weight = payload.cvss_weight
    config.epss_weight = payload.epss_weight
    config.internet_exposed_weight = payload.internet_exposed_weight
    config.asset_criticality_weight = payload.asset_criticality_weight
    config.vuln_age_weight = payload.vuln_age_weight
    config.auth_required_weight = payload.auth_required_weight

    weights = weights_from_config(config)
    findings = db.query(models.ScoredFinding).all()
    for finding in findings:
        _rescore_finding_in_place(finding, weights=weights)

    db.commit()
    db.refresh(config)

    return schemas.RiskWeightsUpdateResult(
        updated_rows=len(findings),
        weights=schemas.RiskWeightsConfig(**weights),
    )


@router.get("/band/{risk_band}", response_model=schemas.PaginatedFindings)
def get_scores_by_risk_band(
    risk_band: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("risk_score"),
    sort_order: str = Query("desc"),
    source: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Return findings for one risk band, paginated and sorted by risk_score DESC.
    """
    normalized_band = _normalize_risk_band(risk_band)
    sort_primary, sort_tie_breaker = _resolve_sorting(sort_by, sort_order)

    total_query = db.query(func.count(models.ScoredFinding.id)).filter(
        models.ScoredFinding.risk_band == normalized_band
    )
    total = _apply_source_filter(total_query, source).scalar() or 0

    if total == 0:
        return schemas.PaginatedFindings(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
        )

    offset = (page - 1) * page_size
    items_query = (
        db.query(models.ScoredFinding).filter(models.ScoredFinding.risk_band == normalized_band)
    )
    items_query = _apply_source_filter(items_query, source)
    items = (
        items_query.order_by(sort_primary, sort_tie_breaker)
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return schemas.PaginatedFindings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/sources", response_model=List[schemas.SourceSummary])
def get_sources_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.ScoredFinding.source,
            models.ScoredFinding.risk_band,
            func.count(models.ScoredFinding.id),
        )
        .group_by(models.ScoredFinding.source, models.ScoredFinding.risk_band)
        .all()
    )

    source_map: dict[str, dict] = {}
    for source, risk_band, count in rows:
        key = source or "unknown"
        if key not in source_map:
            source_map[key] = {
                "total_findings": 0,
                "bands": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            }
        source_map[key]["total_findings"] += int(count)
        if risk_band in source_map[key]["bands"]:
            source_map[key]["bands"][risk_band] = int(count)

    summaries = [
        schemas.SourceSummary(
            source=source_name,
            total_findings=data["total_findings"],
            risk_bands=schemas.RiskBandSummary(**data["bands"]),
        )
        for source_name, data in source_map.items()
    ]
    summaries.sort(key=lambda item: (-item.total_findings, item.source.lower()))
    return summaries


@router.patch("/sources/{source_name}", response_model=schemas.SourceRenameResult)
def rename_source(
    source_name: str,
    payload: schemas.SourceRenameRequest,
    db: Session = Depends(get_db),
):
    old_source = source_name.strip()
    new_source = payload.new_source.strip()

    if not old_source:
        raise HTTPException(status_code=400, detail="Existing source name is required.")
    if not new_source:
        raise HTTPException(status_code=400, detail="New source name is required.")
    if len(new_source) > 80:
        raise HTTPException(status_code=400, detail="New source name must be <= 80 characters.")

    existing = (
        db.query(func.count(models.ScoredFinding.id))
        .filter(models.ScoredFinding.source == old_source)
        .scalar()
        or 0
    )
    if existing == 0:
        raise HTTPException(status_code=404, detail="Source not found.")

    updated_rows = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.source == old_source)
        .update({models.ScoredFinding.source: new_source}, synchronize_session=False)
    )
    db.commit()

    return schemas.SourceRenameResult(
        old_source=old_source,
        new_source=new_source,
        updated_rows=int(updated_rows),
    )


@router.delete("/sources/{source_name}", response_model=schemas.SourceDeleteResult)
def delete_source(source_name: str, db: Session = Depends(get_db)):
    normalized_source = source_name.strip()
    if not normalized_source:
        raise HTTPException(status_code=400, detail="Source name is required.")

    deleted_rows = (
        db.query(models.ScoredFinding)
        .filter(models.ScoredFinding.source == normalized_source)
        .delete(synchronize_session=False)
    )
    if deleted_rows == 0:
        db.rollback()
        raise HTTPException(status_code=404, detail="Source not found.")

    db.commit()
    total_remaining = db.query(func.count(models.ScoredFinding.id)).scalar() or 0
    return schemas.SourceDeleteResult(
        source=normalized_source,
        deleted_rows=int(deleted_rows),
        total_findings_remaining=int(total_remaining),
    )


@router.get("/findings/{finding_db_id}", response_model=schemas.ScoredFindingOut)
def get_finding_by_id(finding_db_id: int, db: Session = Depends(get_db)):
    finding = db.query(models.ScoredFinding).filter(models.ScoredFinding.id == finding_db_id).first()
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")
    return finding


@router.post("/kev/re-enrich", response_model=schemas.KevReenrichResult)
def re_enrich_findings_with_kev(
    payload: schemas.KevReenrichRequest,
    db: Session = Depends(get_db),
):
    csv_path = (payload.csv_path or "").strip()
    if not csv_path:
        raise HTTPException(status_code=400, detail="csv_path is required.")

    try:
        kev_catalog = load_kev_catalog(csv_path)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    weights = weights_from_config(get_or_create_scoring_config(db))
    updated_rows = 0
    marked = 0
    cleared = 0

    findings = db.query(models.ScoredFinding).all()
    for finding in findings:
        record = kev_record_for_cve(kev_catalog, finding.cve_id)
        new_is_kev = bool(record)
        new_date_added = record.date_added if record else None
        new_due_date = record.due_date if record else None
        new_vendor_project = record.vendor_project if record else None
        new_product = record.product if record else None
        new_vuln_name = record.vulnerability_name if record else None
        new_short_desc = record.short_description if record else None
        new_required_action = record.required_action if record else None
        new_ransomware_use = record.ransomware_use if record else None

        changed = (
            bool(finding.is_kev) != new_is_kev
            or finding.kev_date_added != new_date_added
            or finding.kev_due_date != new_due_date
            or finding.kev_vendor_project != new_vendor_project
            or finding.kev_product != new_product
            or finding.kev_vulnerability_name != new_vuln_name
            or finding.kev_short_description != new_short_desc
            or finding.kev_required_action != new_required_action
            or finding.kev_ransomware_use != new_ransomware_use
        )
        if not changed:
            continue

        if not bool(finding.is_kev) and new_is_kev:
            marked += 1
        if bool(finding.is_kev) and not new_is_kev:
            cleared += 1

        finding.is_kev = new_is_kev
        finding.kev_date_added = new_date_added
        finding.kev_due_date = new_due_date
        finding.kev_vendor_project = new_vendor_project
        finding.kev_product = new_product
        finding.kev_vulnerability_name = new_vuln_name
        finding.kev_short_description = new_short_desc
        finding.kev_required_action = new_required_action
        finding.kev_ransomware_use = new_ransomware_use
        _rescore_finding_in_place(finding, weights=weights)
        updated_rows += 1

    db.commit()
    return schemas.KevReenrichResult(
        csv_path=csv_path,
        updated_rows=updated_rows,
        kev_rows_marked=marked,
        kev_rows_cleared=cleared,
    )


@router.post(
    "/findings/{finding_db_id}/disposition",
    response_model=schemas.FindingDispositionResult,
)
def set_finding_disposition(
    finding_db_id: int,
    payload: schemas.FindingDispositionUpdateRequest,
    db: Session = Depends(get_db),
):
    finding = db.query(models.ScoredFinding).filter(models.ScoredFinding.id == finding_db_id).first()
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    disposition = _normalize_disposition(payload.disposition)
    if disposition == "none":
        raise HTTPException(
            status_code=400,
            detail="Use the clear disposition endpoint to reset a finding to none.",
        )

    old_value = {
        "disposition": finding.disposition or "none",
        "disposition_state": finding.disposition_state,
        "disposition_reason": finding.disposition_reason,
        "disposition_comment": finding.disposition_comment,
        "disposition_expires_at": finding.disposition_expires_at,
        "disposition_created_by": finding.disposition_created_by,
    }

    now = datetime.utcnow()
    finding.disposition = disposition
    finding.disposition_state = "active"
    finding.disposition_reason = (payload.reason or "").strip() or None
    finding.disposition_comment = (payload.comment or "").strip() or None
    finding.disposition_expires_at = payload.expires_at
    finding.disposition_created_at = now
    finding.disposition_created_by = (payload.actor or "manual").strip() or "manual"

    _record_finding_event(
        db,
        finding=finding,
        event_type="disposition_changed",
        actor=finding.disposition_created_by or "manual",
        old_value=old_value,
        new_value={
            "disposition": finding.disposition,
            "disposition_state": finding.disposition_state,
            "disposition_reason": finding.disposition_reason,
            "disposition_comment": finding.disposition_comment,
            "disposition_expires_at": finding.disposition_expires_at,
            "disposition_created_by": finding.disposition_created_by,
        },
    )

    db.commit()
    db.refresh(finding)
    return _to_disposition_result(finding)


@router.post(
    "/findings/{finding_db_id}/disposition/clear",
    response_model=schemas.FindingDispositionResult,
)
def clear_finding_disposition(
    finding_db_id: int,
    actor: str | None = Query(None),
    db: Session = Depends(get_db),
):
    finding = db.query(models.ScoredFinding).filter(models.ScoredFinding.id == finding_db_id).first()
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found.")

    old_value = {
        "disposition": finding.disposition or "none",
        "disposition_state": finding.disposition_state,
        "disposition_reason": finding.disposition_reason,
        "disposition_comment": finding.disposition_comment,
        "disposition_expires_at": finding.disposition_expires_at,
        "disposition_created_by": finding.disposition_created_by,
    }

    finding.disposition = "none"
    finding.disposition_state = None
    finding.disposition_reason = None
    finding.disposition_comment = None
    finding.disposition_created_at = None
    finding.disposition_expires_at = None
    finding.disposition_created_by = None

    _record_finding_event(
        db,
        finding=finding,
        event_type="disposition_changed",
        actor=(actor or "manual").strip() or "manual",
        old_value=old_value,
        new_value={"disposition": "none"},
    )

    db.commit()
    db.refresh(finding)
    return _to_disposition_result(finding)


@router.post("/seed/qualys-csv", response_model=schemas.SeedUploadResult)
async def seed_qualys_csv(
    source: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Seed the DB from a Qualys-style CSV upload.

    Safety checks:
    - accepts `.csv` files only
    - rejects empty/malformed CSV
    - enforces required columns
    - validates scanner/source name
    - appends rows to existing findings
    """
    source_name = source.strip()
    if not source_name:
        raise HTTPException(status_code=400, detail="Source name is required.")
    if len(source_name) > 80:
        raise HTTPException(status_code=400, detail="Source name must be <= 80 characters.")

    filename = file.filename or "uploaded.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    raw = await file.read()
    await file.close()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV file is too large (max 10MB).")

    try:
        csv_text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="CSV must be UTF-8 encoded.",
        ) from exc

    try:
        config = get_or_create_scoring_config(db)
        kev_catalog = load_kev_catalog_from_env()
        rows_to_add = parse_qualys_csv_to_scored_findings(
            csv_text,
            source=source_name,
            weights=weights_from_config(config),
            kev_catalog=kev_catalog,
        )
        db.add_all(rows_to_add)
        db.commit()
    except FileNotFoundError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        db.rollback()
        raise

    total_after = db.query(func.count(models.ScoredFinding.id)).scalar() or 0
    return schemas.SeedUploadResult(
        inserted=len(rows_to_add),
        source=source_name,
        total_findings=total_after,
    )

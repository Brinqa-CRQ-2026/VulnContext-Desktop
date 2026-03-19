from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.common import rescore_finding_in_place
from app.core.db import get_db
from app.core.risk_weights import get_or_create_scoring_config, weights_from_config
from app.services.kev_enrichment import kev_record_for_cve, load_kev_catalog

router = APIRouter(tags=["admin"])


@router.post("/admin/enrichment/kev/reload", response_model=schemas.KevReenrichResult)
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
        rescore_finding_in_place(finding, weights=weights)
        updated_rows += 1

    db.commit()
    return schemas.KevReenrichResult(
        csv_path=csv_path,
        updated_rows=updated_rows,
        kev_rows_marked=marked,
        kev_rows_cleared=cleared,
    )

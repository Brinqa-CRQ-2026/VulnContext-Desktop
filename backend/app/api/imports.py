from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.db import get_db
from app.core.risk_weights import get_or_create_scoring_config, weights_from_config
from app.epss import get_epss_scores
from app.seed import enrich_findings_with_epss, parse_staged_findings_csv_to_scored_findings
from app.services.nvd_enrichment import enrich_findings_with_nvd_cache

router = APIRouter(tags=["imports"])


@router.post("/imports/findings/csv", response_model=schemas.SeedUploadResult)
async def import_findings_csv(
    source: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
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
        try:
            get_epss_scores()
        except Exception:
            pass
        rows_to_add = parse_staged_findings_csv_to_scored_findings(
            csv_text,
            source=source_name,
        )
        enrich_findings_with_epss(
            rows_to_add,
            db=db,
            weights=weights_from_config(config),
        )
        enrich_findings_with_nvd_cache(
            rows_to_add,
            db=db,
            weights=weights_from_config(config),
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

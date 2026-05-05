from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.common import display_score_expression


def top_findings_query(db: Session):
    return (
        db.query(models.Finding)
        .options(joinedload(models.Finding.asset))
        .order_by(display_score_expression().desc(), models.Finding.id.desc())
    )


def finding_summary_rows(db: Session):
    return db.query(
        models.Finding.id,
        models.Finding.crq_finding_score,
        models.Finding.brinqa_risk_score,
        models.Finding.crq_finding_is_kev,
    )


def findings_query(db: Session, *, include_asset: bool = False):
    query = db.query(models.Finding)
    if include_asset:
        query = query.options(joinedload(models.Finding.asset))
    return query


def findings_count_query(db: Session):
    return db.query(func.count(models.Finding.id))


def get_finding_by_id(db: Session, finding_id: str, *, include_asset: bool = False):
    query = findings_query(db, include_asset=include_asset)
    return query.filter(models.Finding.finding_id == finding_id).first()


from datetime import datetime, timezone
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from supabase import create_client

from app import schemas
from app.services.security_score import (
    DEFAULT_CONTROL_ANSWERS,
    compute_security_score,
)

router = APIRouter(tags=["controls"])
CONTROL_ASSESSMENTS_TABLE = "control_assessments"


def get_supabase_client():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=503,
            detail="Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend environment.",
        )

    return create_client(supabase_url, supabase_key)


@router.post(
    "/controls/security-score",
    response_model=schemas.SecurityScoreResponse,
)
def score_security_score(payload: schemas.SecurityScoreRequest):
    return compute_security_score(payload.answers)


@router.put("/controls/current", response_model=schemas.ControlAssessmentResponse)
def save_current_control_assessment(payload: schemas.ControlAssessmentRequest):
    result = compute_security_score(payload.answers)
    now = datetime.now(timezone.utc).isoformat()

    data = {
        "updated_at": now,
        "control_score": result["control_score"],
        "confidence": result["confidence"],
        "prevent_score": result["prevent_score"],
        "detect_score": result["detect_score"],
        "respond_score": result["respond_score"],
        "contain_score": result["contain_score"],
        "answers": result["answers"],
    }

    supabase = get_supabase_client()

    try:
        existing = (
            supabase.table(CONTROL_ASSESSMENTS_TABLE)
            .select("id")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )

        if existing.data:
            assessment_id = existing.data[0]["id"]
            response = (
                supabase.table(CONTROL_ASSESSMENTS_TABLE)
                .update(data)
                .eq("id", assessment_id)
                .execute()
            )
        else:
            response = supabase.table(CONTROL_ASSESSMENTS_TABLE).insert(data).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to save security score to Supabase.",
        ) from exc

    return _coerce_control_assessment_response(response.data, fallback=data)


@router.get("/controls/current", response_model=schemas.ControlAssessmentResponse)
def get_current_control_assessment():
    supabase = get_supabase_client()

    try:
        response = (
            supabase.table(CONTROL_ASSESSMENTS_TABLE)
            .select("*")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to retrieve security score from Supabase.",
        ) from exc

    if not response.data:
        default_result = compute_security_score(DEFAULT_CONTROL_ANSWERS)
        return schemas.ControlAssessmentResponse(
            id=None,
            created_at=None,
            updated_at=None,
            **_assessment_scores(default_result),
        )

    return _coerce_control_assessment_response(response.data)


@router.post("/controls/save", response_model=schemas.ControlAssessmentResponse)
def save_control_assessment_legacy(payload: schemas.ControlAssessmentRequest):
    return save_current_control_assessment(payload)


@router.get("/controls/saved/latest", response_model=schemas.ControlAssessmentResponse | None)
def get_latest_control_assessment():
    supabase = get_supabase_client()

    try:
        response = (
            supabase.table(CONTROL_ASSESSMENTS_TABLE)
            .select("*")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to retrieve latest security score from Supabase.",
        ) from exc

    return _coerce_control_assessment_response(response.data) if response.data else None


def _coerce_control_assessment_response(
    rows: list[dict[str, Any]] | None,
    *,
    fallback: dict[str, Any] | None = None,
) -> schemas.ControlAssessmentResponse:
    row = rows[0] if rows else fallback
    if not row:
        raise HTTPException(status_code=502, detail="Supabase returned no security score data.")

    return schemas.ControlAssessmentResponse(
        id=row.get("id"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        control_score=float(row["control_score"]),
        confidence=float(row["confidence"]),
        prevent_score=float(row["prevent_score"]),
        detect_score=float(row["detect_score"]),
        respond_score=float(row["respond_score"]),
        contain_score=float(row["contain_score"]),
        answers=row["answers"],
    )


def _assessment_scores(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "control_score": result["control_score"],
        "confidence": result["confidence"],
        "prevent_score": result["prevent_score"],
        "detect_score": result["detect_score"],
        "respond_score": result["respond_score"],
        "contain_score": result["contain_score"],
        "answers": result["answers"],
    }

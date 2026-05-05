from fastapi import APIRouter, Depends

from app import schemas
from app.core.db import get_db
from app.services.sources_view import get_sources_summary as _get_sources_summary

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[schemas.SourceSummary])
def get_sources_summary(db=Depends(get_db)):
    return _get_sources_summary(db)


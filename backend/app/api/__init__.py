from app.api.admin import router as admin_router
from app.api.findings import router as findings_router
from app.api.imports import router as imports_router
from app.api.risk_weights import router as risk_weights_router
from app.api.sources import router as sources_router

ROUTERS = (
    findings_router,
    sources_router,
    risk_weights_router,
    imports_router,
    admin_router,
)

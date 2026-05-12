from app.api.controls import router as controls_router
from app.api.findings import router as findings_router
from app.api.sources import router as sources_router
from app.api.topology import router as topology_router

ROUTERS = (
    topology_router,
    controls_router,
    findings_router,
    sources_router,
)

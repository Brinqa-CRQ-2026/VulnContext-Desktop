"""Topology and asset API router package."""

from fastapi import APIRouter

from app.api.topology import applications, assets, business_services, business_units, fair_loss
from app.api.topology.dependencies import _has_topology_schema

router = APIRouter(tags=["topology"])

for sub_router in (
    business_units.router,
    business_services.router,
    fair_loss.router,
    applications.router,
    assets.router,
):
    router.include_router(sub_router)

__all__ = ("router", "_has_topology_schema")

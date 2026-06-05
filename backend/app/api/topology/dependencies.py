from fastapi import HTTPException

from app.repositories.topology import has_topology_schema as _repo_has_topology_schema


def _has_topology_schema(db):
    return _repo_has_topology_schema(db)


def require_topology_schema(db, *, route_group: str = "business-unit topology routes") -> None:
    if _has_topology_schema(db):
        return

    raise HTTPException(
        status_code=503,
        detail=(
            "Normalized topology tables are not initialized. "
            "Apply docs/backend/topology-seed/topology-expansion.sql before using "
            f"{route_group}."
        ),
    )


def require_business_unit_filter_schema(db) -> None:
    if _has_topology_schema(db):
        return

    raise HTTPException(
        status_code=503,
        detail=(
            "The business_unit filter requires the normalized topology schema. "
            "Apply docs/backend/topology-seed/topology-expansion.sql first."
        ),
    )

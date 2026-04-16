# Backend Feature And Test Matrix

## Current status

- Backend test suite currently passes: `13 passed` on April 16, 2026.
- FastAPI docs are available locally at `http://localhost:8000/docs`.
- ReDoc is available at `http://localhost:8000/redoc`.

## Backend features and what tests cover them

### 1. App boot and findings reads

Files:

- `backend/app/main.py`
- `backend/app/api/findings.py`
- `backend/app/api/sources.py`
- `backend/tests/test_findings_api.py`

Covered cases:

- `/health` returns app health
- docs and OpenAPI endpoints are exposed
- `/findings/summary` returns derived risk-band counts
- `/findings` returns paginated results
- `/findings/{id}` returns finding detail
- finding detail returns thin persisted finding data only
- `/sources` returns a read-only source summary

Not directly covered yet:

- invalid `sort_by`
- invalid `sort_order`
- invalid risk-band values
- missing finding IDs

### 2. Topology and asset reads

Files:

- `backend/app/api/topology.py`
- `backend/app/services/topology.py`
- `backend/tests/test_topology_api.py`

Covered cases:

- business-unit list/detail routes
- business-service detail route
- application detail route
- `/assets` list filtering
- `/assets/{id}` detail
- `/assets/{id}/findings`
- business-service and application rollups
- direct assets under a service when `application_id` is null
- legacy asset filtering still works before topology normalization is fully available

Edge cases covered:

- missing normalized topology tables return `503` on business-unit topology routes
- `/assets` still works when normalized topology tables are absent
- topology unique constraints prevent duplicate parent-scoped slugs
- exact-name asset FK backfill keeps unmatched assets unchanged
- assets without matching applications keep `application_id = null`

### 3. Topology model and seed expectations

Files:

- `backend/app/models.py`
- `backend/tests/test_topology_api.py`

Covered cases:

- runtime model includes the four normalized topology tables
- seed counts match the intended first import pass:
  - 2 companies
  - 2 business units
  - 5 business services
  - 7 applications

## Bottom line

- The backend is now a focused read-oriented service.
- Coverage is strongest around findings reads, topology reads, and topology backfill behavior.
- The main remaining gaps are validation/error paths and live Postgres integration coverage.

## Recommended next tests

1. Add negative tests for bad sort/filter parameters and missing IDs.
2. Add integration coverage against a real Postgres or Supabase-like database.
3. Add route-contract tests once the frontend starts consuming the new topology surface.

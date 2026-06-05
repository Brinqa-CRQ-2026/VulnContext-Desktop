# Backend API Tests

## Files

- `backend/tests/api/test_findings.py`
- `backend/tests/api/test_sources.py`
- `backend/tests/api/test_fair_loss.py`
- `backend/tests/api/test_controls.py`

## Backend Coverage

- `backend/app/api/findings.py`
- `backend/app/api/sources.py`
- `backend/app/api/controls.py`
- FAIR loss routes in `backend/app/api/findings.py` and `backend/app/api/topology/fair_loss.py`
- `backend/app/main.py` health and OpenAPI metadata routes
- findings and sources view services reached through the public API

## Cases Covered

- `/health`, `/api/v1/health`, `/docs`, and `/openapi.json` are available.
- `/findings/summary` counts total findings, normalized display risk bands, and KEV totals.
- `/findings` returns paginated finding summaries, preserves sort behavior, and prefers CRQ display scores when available.
- `/api/v1/findings` and `/api/v1/findings/summary` continue to work through versioned router registration.
- `/findings/{finding_id}` returns persisted detail fields only and does not include external narrative enrichment.
- `/sources` returns read-only source totals from persisted findings.
- FAIR loss routes map finding, asset, application, and business-service scopes to prediction services.
- Controls routes cover score calculation, current assessment read/write, latest saved read, legacy save delegation, missing Supabase env, and Supabase failure mapping.

## Not Covered Here

- Authentication and authorization; the current backend routes do not enforce auth in these tests.
- External Brinqa network behavior; live-fetch enrichment is legacy code outside the active backend coverage target.

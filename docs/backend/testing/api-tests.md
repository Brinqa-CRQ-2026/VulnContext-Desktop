# Backend API Tests

## Files

- `backend/tests/api/test_findings.py`
- `backend/tests/api/test_sources.py`

## Backend Coverage

- `backend/app/api/findings.py`
- `backend/app/api/sources.py`
- `backend/app/main.py` health and OpenAPI metadata routes
- findings and sources view services reached through the public API

## Cases Covered

- `/health`, `/api/v1/health`, `/docs`, and `/openapi.json` are available.
- `/findings/summary` counts total findings, normalized display risk bands, and KEV totals.
- `/findings` returns paginated finding summaries, preserves sort behavior, and prefers CRQ display scores when available.
- `/api/v1/findings` and `/api/v1/findings/summary` continue to work through versioned router registration.
- `/findings/{finding_id}` returns persisted detail fields only and does not silently include external narrative enrichment.
- `/findings/{finding_id}/enrichment` returns the explicit Brinqa narrative payload when requested.
- `/sources` returns read-only source totals from persisted findings.

## Not Covered Here

- `/findings/{finding_id}/fair-loss`; see [coverage-gaps.md](coverage-gaps.md).
- Authentication and authorization; the current backend routes do not enforce auth in these tests.
- External Brinqa network behavior; enrichment service calls are mocked at the route boundary.

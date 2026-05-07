# Frontend API Client

The frontend API layer is read-only. It wraps backend routes and leaves state coordination to hooks.

## Active Modules

- `frontend/src/api/client.ts`
  Base URL resolution, request URL construction, Brinqa enrichment request headers, and JSON error parsing.
- `frontend/src/api/findings.ts`
  Findings summary, paginated findings, finding detail, and finding enrichment requests.
- `frontend/src/api/sources.ts`
  Source summary request.
- `frontend/src/api/topology.ts`
  Business-unit, business-service, application, asset, asset analytics, asset enrichment, and asset findings requests.
- `frontend/src/api/index.ts`
  Barrel export for the active API surface.
- `frontend/src/api/types.ts`
  Compatibility barrel that re-exports from `frontend/src/types`. Do not define new types here.

## Type Source

API functions should import response and query types from `frontend/src/types`.

The backend source of truth is:

- route `response_model`s in `backend/app/api/*.py`
- schemas in `backend/app/schemas.py`

When a backend response changes, update `frontend/src/types` and the focused API/hook/component tests together. Do not add fields to frontend DTOs just because they exist in Brinqa payloads or old UI fixtures.

## Removed From Active Surface

The frontend no longer exports helpers for:

- CSV import
- risk-weight editing
- finding disposition writes
- source rename/delete

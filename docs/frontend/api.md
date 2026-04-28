# Frontend API Layer

## Active modules

- `frontend/src/api/client.ts`
  Base URL resolution and consistent JSON error parsing.
- `frontend/src/api/types.ts`
  Shared response types used across hooks and components.
- `frontend/src/api/findings.ts`
  Read-only findings requests.
- `frontend/src/api/sources.ts`
  Read-only source summary request.
- `frontend/src/api/topology.ts`
  Business-unit, business-service, application, asset, and asset-findings requests.
- `frontend/src/api/index.ts`
  Barrel export of the active API surface.

## Removed from active surface

The frontend no longer exports helpers for:

- CSV import
- risk-weight editing
- finding disposition writes
- source rename/delete

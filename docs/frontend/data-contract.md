# Frontend Data Contract

This is the lightweight frontend-facing data contract overview.

## Backend sources used by the frontend

- `/findings`
- `/findings/summary`
- `/findings/top`
- `/findings/{finding_db_id}`
- `/findings/{finding_db_id}/disposition`
- `/findings/{finding_db_id}/disposition/clear`
- `/sources`
- `/sources/{source_name}`
- `/risk-weights`
- `/imports/findings/csv`

## Main frontend API client

- `frontend/src/api/client.ts`
- `frontend/src/api/findings.ts`
- `frontend/src/api/sources.ts`
- `frontend/src/api/imports.ts`
- `frontend/src/api/risk-weights.ts`
- `frontend/src/api/types.ts`

## Main pages and what they call

### Findings table

- Uses `GET /findings`
- Uses `GET /sources`
- Supports sorting and filtering using backend query params

### Finding detail page

- Uses `GET /findings/{finding_db_id}`
- Uses disposition set and clear routes

### Source management / integrations page

- Uses source summary, rename, delete, and CSV import routes

### Risk weights editor

- Uses `GET /risk-weights`
- Uses `PUT /risk-weights`

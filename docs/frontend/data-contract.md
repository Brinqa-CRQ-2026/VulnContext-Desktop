# Frontend Data Contract

This is the lightweight frontend-facing data contract overview.

## Backend sources used by the frontend

- `/findings`
- `/findings/summary`
- `/findings/top`
- `/findings/{finding_db_id}`
- `/findings/{finding_db_id}/disposition`
- `/findings/{finding_db_id}/disposition/clear`
- `/topology/business-units`
- `/topology/business-units/{business_unit_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `/assets`
- `/assets/{asset_id}/findings`
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
- `frontend/src/api/topology.ts`
- `frontend/src/api/types.ts`

## Main pages and what they call

### Findings table

- Uses `GET /findings`
- Uses `GET /sources`
- Supports sorting and filtering using backend query params

### Finding detail page

- Uses `GET /findings/{finding_db_id}`
- Uses disposition set and clear routes
- Can be opened from:
  - the global findings table
  - the topology asset findings table
- Uses route origin state to rebuild the correct breadcrumb path

### Topology drill-down pages

- Business units use `GET /topology/business-units`
- Business-service pages use `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- Application pages use `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- Asset inventory panels use `GET /assets` with paging, search, status, and topology filters
- Asset findings uses `GET /assets/{asset_id}/findings` with:
  - `page`
  - `page_size`
  - `sort_by`
  - `sort_order`
  - `risk_band`
  - `kev_only`
  - `source`
  - `search`

### Source management / integrations page

- Uses source summary, rename, delete, and CSV import routes

### Risk weights editor

- Uses `GET /risk-weights`
- Uses `PUT /risk-weights`

## Important current shapes

- `ScoredFinding` is shared across:
  - main findings table
  - asset findings table
  - finding detail page
- Finding summary rows now include CRQ-first scoring fields for:
  - `risk_score`
  - `cvss_score`
  - `epss_score`
  - `isKev`
- `AssetFindingsPage` returns:
  - `asset`
  - `items`
  - `total`
  - `page`
  - `page_size`

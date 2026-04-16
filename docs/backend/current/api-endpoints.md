# Backend API Endpoints

Base URL: `http://127.0.0.1:8000`

This document describes each active backend endpoint, what it is used for, its inputs and outputs, and where its data comes from.

## Health

### `GET /health`

Use:
- Confirms the FastAPI app is up.

Inputs:
- None.

Output:
- JSON:
```json
{ "status": "ok" }
```

Data source:
- No database read.
- Static in-process response from the app.

## Topology

### `GET /topology/business-units`

Use:
- Topology landing page for business-unit browsing.
- Returns one row per business unit with company name and rolled-up count metrics.

Inputs:
- None.

Output:
- JSON array of:
  - `company.name`
  - `business_unit`
  - `slug`
  - `metrics.total_business_services`
  - `metrics.total_assets`
  - `metrics.total_findings`

Data source:
- Reads from normalized topology tables: `companies`, `business_units`, `business_services`.
- Rolls up asset and finding counts from `assets` and `findings`.

### `GET /topology/business-units/{business_unit_slug}`

Use:
- Business-unit detail page.
- Shows business-unit metadata, child business services, and rolled-up count metrics.

Inputs:
- Path param:
  - `business_unit_slug`

Output:
- JSON object with:
  - `company`
  - `business_unit`
  - `slug`
  - source metadata fields
  - `metrics`
  - `business_services`

Data source:
- Reads from normalized topology tables.
- Rolls up asset and finding counts through `assets.business_service_id` and `findings.asset_id`.

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`

Use:
- Business-service detail page inside one business unit.
- Shows application subgroup summaries and direct assets where `application_id IS NULL`.

Inputs:
- Path params:
  - `business_unit_slug`
  - `business_service_slug`

Output:
- JSON object with:
  - `company`
  - `business_unit`
  - `business_service`
  - `slug`
  - source metadata fields
  - `metrics`
  - `applications`
  - `direct_assets`

Data source:
- Reads from normalized topology tables.
- Uses `assets.business_service_id` and `assets.application_id` for drill-down.

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`

Use:
- Application detail page within one business service.

Inputs:
- Path params:
  - `business_unit_slug`
  - `business_service_slug`
  - `application_slug`

Output:
- JSON object with:
  - `company`
  - `business_unit`
  - `business_service`
  - `application`
  - `slug`
  - `first_seen_at`
  - `metrics`
  - `assets`

Data source:
- Reads from normalized topology tables.
- Returns assets attached to the selected `application_id`.

## Assets

### `GET /assets`

Use:
- Asset list page or topology drill-down list.

Inputs:
- Query params:
  - `page`
  - `page_size`
  - `business_unit`
  - `business_service`
  - `application`

Output:
- JSON object:
  - `items`
  - `total`
  - `page`
  - `page_size`

Data source:
- Reads from Supabase-backed `assets`.
- Adds per-asset finding counts from `findings`.
- `business_service` and `application` filters remain backward-compatible with legacy text columns during the transition.

### `GET /assets/{asset_id}`

Use:
- Asset detail page.

Inputs:
- Path param:
  - `asset_id`

Output:
- One `AssetDetail` JSON object.

Data source:
- Reads thin asset data from `assets`.
- Does not fetch live Brinqa detail in the current runtime.

### `GET /assets/{asset_id}/findings`

Use:
- Asset drill-down for all findings under one selected asset.

Inputs:
- Path param:
  - `asset_id`

Output:
- JSON object:
  - `asset`
  - `items`
  - `total`

Data source:
- Reads the asset from `assets`.
- Reads child findings from `findings` filtered by `asset_id`.

## Findings

### `GET /findings/summary`

Use:
- Dashboard summary totals.
- Risk band counts across all stored findings.
- KEV subtotal counts.

Inputs:
- None.

Output:
- JSON object with:
  - `total_findings`
  - `risk_bands`
  - `kevFindingsTotal`
  - `kevRiskBands`

Data source:
- Reads from Supabase-backed `findings`.
- Derives risk bands from `brinqa_risk_score`.

### `GET /findings/top`

Use:
- Top findings table.
- Highest-risk findings ranked by display risk score.

Inputs:
- None.

Output:
- JSON array of up to 10 `FindingSummary` records.

Data source:
- Reads from Supabase-backed `findings`.
- Orders by `brinqa_risk_score`.

### `GET /findings`

Use:
- Main findings table.
- Paginated findings browsing.
- Filtering by source or derived risk band.

Inputs:
- Query params:
  - `page`
  - `page_size`
  - `sort_by`
  - `sort_order`
  - `source`
  - `risk_band`

Output:
- JSON object:
  - `items`
  - `total`
  - `page`
  - `page_size`

Data source:
- Reads from Supabase-backed `findings`.
- Uses `brinqa_risk_score` for default sorting and derived band filtering.

### `GET /findings/{finding_db_id}`

Use:
- Finding detail page.
- Fetch one full finding record by DB primary key.

Inputs:
- Path param:
  - `finding_db_id`

Output:
- One `ScoredFindingOut` JSON object.

Data source:
- Reads the finding from Supabase-backed `findings`.
- Does not fetch live Brinqa detail in the current runtime.

## Sources

### `GET /sources`

Use:
- Source inventory page.
- Per-source counts and risk distribution.

Inputs:
- None.

Output:
- JSON array of source summary objects:
  - `source`
  - `total_findings`
  - `risk_bands`

Data source:
- Reads from Supabase-backed `findings`.
- Current runtime exposes a single read-only summarized source, `Brinqa`.

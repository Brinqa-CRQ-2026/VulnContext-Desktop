# Backend API Endpoints

This file documents the currently served backend routes.

## Meta

- `GET /health`
  Returns `{ "status": "ok" }`.

## Findings

- `GET /findings/top`
  Returns the highest-ranked findings using the display-score expression.
- `GET /findings/summary`
  Returns overall risk-band totals plus KEV totals.
- `GET /findings`
  Supports `page`, `page_size`, `sort_by`, `sort_order`, optional `source`, and optional `risk_band`.
- `GET /findings/{finding_id}`
  Returns one finding detail record with best-effort enrichment fallback.

There are no active disposition write routes in the current backend.

## Topology

- `GET /topology/business-units`
- `GET /topology/business-units/{business_unit_slug}`
- `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `GET /assets`
- `GET /assets/{asset_id}`
- `GET /assets/{asset_id}/findings`

The business-unit hierarchy depends on the normalized topology tables created from `docs/backend/topology-seed/topology-expansion.sql`.

## Sources

- `GET /sources`
  Returns source summary counts derived from findings.

There are no active source rename or delete routes in the current backend.

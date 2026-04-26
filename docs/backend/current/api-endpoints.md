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
  Returns one persisted finding detail record. It does not supplement CVSS/EPSS/KEV values during response building.
- `GET /findings/{finding_id}/enrichment`
  Returns optional Brinqa narrative/detail fields for a single finding only. This route is explicit and separate from the main finding detail response.

There are no active disposition write routes in the current backend.

## Topology

- `GET /topology/business-units`
- `GET /topology/business-units/{business_unit_slug}`
- `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `GET /assets`
- `GET /assets/{asset_id}`
  Returns DB-only asset detail and never calls Brinqa.
- `GET /assets/{asset_id}/enrichment`
  Returns request-scoped Brinqa enrichment only. The frontend/Electron layer owns the token and forwards it with `X-Brinqa-Auth-Token` on this route only.
  Status values: `missing_token`, `unauthorized_token`, `no_related_source`, `partial_success`, `success`, `upstream_error`.
  Includes a machine-readable `reason` code for each response. `detail_source` and `detail_fetched_at` are populated on `success` and `partial_success`.
- `GET /assets/{asset_id}/findings`
- `GET /assets/{asset_id}/findings/analytics`
  Returns compact asset overview fields plus analytics for the full filtered result set across all pages. It accepts the same non-pagination filters used by the asset findings table route.

The business-unit hierarchy depends on the normalized topology tables created from `docs/backend/topology-seed/topology-expansion.sql`.

## Sources

- `GET /sources`
  Returns source summary counts derived from findings.

There are no active source rename or delete routes in the current backend.

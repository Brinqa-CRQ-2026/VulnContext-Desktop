# Frontend Data Contract

## Backend routes used by the frontend

- `/findings`
- `/findings/summary`
- `/findings/top`
- `/findings/{finding_id}`
- `/topology/business-units`
- `/topology/business-units/{business_unit_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `/assets`
- `/assets/{asset_id}`
- `/assets/{asset_id}/enrichment`
- `/assets/{asset_id}/findings`
- `/sources`

## Notes

- The frontend is currently read-only with respect to findings, sources, and imports.
- Older routes for CSV import, source mutation, disposition writes, and risk-weight updates are not part of the active contract.
- The findings table and asset-findings view share the same broad `ScoredFinding` shape.
- `GET /assets/{asset_id}` is DB-only. `GET /assets/{asset_id}/enrichment` is the only route that forwards the stored Brinqa token.
- Asset enrichment returns `status` plus machine-readable `reason`. Status values are `missing_token`, `unauthorized_token`, `no_related_source`, `partial_success`, `success`, and `upstream_error`.

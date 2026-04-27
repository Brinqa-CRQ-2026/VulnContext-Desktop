# Frontend Data Contract

## Backend routes used by the frontend

- `/findings`
- `/findings/summary`
- `/findings/top`
- `/findings/{finding_id}`
- `/findings/{finding_id}/enrichment`
- `/topology/business-units`
- `/topology/business-units/{business_unit_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `/assets`
- `/assets/analytics`
- `/assets/{asset_id}`
- `/assets/{asset_id}/enrichment`
- `/assets/{asset_id}/findings`
- `/assets/{asset_id}/findings/analytics`
- `/sources`

## Notes

- The frontend is currently read-only with respect to findings, sources, and imports.
- Older routes for CSV import, source mutation, disposition writes, and risk-weight updates are not part of the active contract.
- The findings table and asset-findings view share the same broad `ScoredFinding` shape.
- `GET /findings/{finding_id}` is persisted-data-only. Optional Brinqa narrative fields now live on `GET /findings/{finding_id}/enrichment`.
- `GET /assets/{asset_id}` is DB-only. `GET /assets/{asset_id}/enrichment` is the only route that forwards the stored Brinqa token.
- `GET /assets/analytics` powers the business-service/application asset distribution charts for the full filtered asset result set. It accepts the same non-pagination filters used by `GET /assets`: `business_unit`, `business_service`, `application`, `status`, `environment`, `compliance`, `search`, and `direct_only`.
- `GET /assets/{asset_id}/findings/analytics` powers the asset-page summary cards and charts for the full filtered result set, independent of table pagination.
- Asset enrichment returns `status` plus machine-readable `reason`. Status values are `missing_token`, `unauthorized_token`, `no_related_source`, `partial_success`, `success`, and `upstream_error`.
- The frontend uses `unauthorized_token` as the current recovery signal for Brinqa session reset and relogin.

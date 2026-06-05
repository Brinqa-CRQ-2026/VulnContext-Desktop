# Frontend Data Contracts

The frontend contract follows backend schemas, not raw database tables or historical Brinqa payloads.

## Backend Routes Used By The Frontend

- `/findings`
- `/findings/summary`
- `/findings/top`
- `/findings/{finding_id}`
- `/findings/{finding_id}/fair-loss`
- `/controls/current`
- `/controls/security-score`
- `/topology/business-units`
- `/topology/business-units/{business_unit_slug}`
- `/topology/business-units/{business_unit_slug}/risk-overview`
- `/topology/business-units/{business_unit_slug}/findings`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`
- `/topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss`
- `/assets`
- `/assets/analytics`
- `/assets/{asset_id}`
- `/assets/{asset_id}/fair-loss`
- `/assets/{asset_id}/findings`
- `/assets/{asset_id}/findings/analytics`
- `/sources`

## Contract Rules

- `backend/app/schemas.py` is the source of truth for frontend response DTO fields.
- `ScoredFinding` represents the shared frontend view of `FindingSummary` plus optional `FindingDetail` fields.
- Do not keep stale finding fields in frontend types unless the backend schema returns them.
- Date/time values arrive as serialized strings in the renderer.
- `AssetFindingsPageResponse` is the preferred frontend name for the asset findings page response. `AssetFindingsPage` remains a compatibility alias.

## Current Notes

- The frontend is read-only with respect to findings, sources, and imports.
- Older routes for CSV import, source mutation, disposition writes, and risk-weight updates are not part of the active contract.
- `GET /findings/{finding_id}` returns persisted finding detail. Optional Brinqa narrative fields that are not in the schema should not be assumed in the UI.
- `GET /assets/{asset_id}` is DB-only and returns persisted asset metadata.
- `GET /assets/analytics` accepts the same non-pagination filters used by `GET /assets`: `business_unit`, `business_service`, `application`, `status`, `environment`, `compliance`, `search`, and `direct_only`.
- `GET /assets/{asset_id}/findings/analytics` powers asset-page summary cards and charts independent of table pagination.
- FAIR loss routes return prediction summaries for finding, asset, application, and business-service scopes.
- Controls routes return the current security assessment and computed security-score context.

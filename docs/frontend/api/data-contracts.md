# Frontend Data Contracts

## Summary

The frontend contract follows backend schemas, not raw database tables or historical Brinqa payloads. Backend route docs and `backend/app/schemas.py` are the source of truth.

## Contract Owners

| Frontend module | Backend docs | Primary consumers |
| --- | --- | --- |
| `frontend/src/api/findings.ts` | [Findings API](../../backend/api/findings.md) | dashboard, risk table, finding detail |
| `frontend/src/api/topology.ts` | [Topology And Assets API](../../backend/api/topology-and-assets.md) | topology pages, asset inventory, asset findings |
| `frontend/src/api/sources.ts` | [Sources API](../../backend/api/sources.md) | sources page, dashboard summary |
| `frontend/src/api/controls.ts` | [FAIR Frontend Backend Contract](../../backend/fair/frontend-backend-contract.md) | security-score page, FAIR panels |
| `frontend/src/api/client.ts` | [Backend API Reference](../../backend/api/README.md) | all API modules |

## Findings Contracts

| Function | Route | Inputs | Output |
| --- | --- | --- | --- |
| `getTopFindings()` | `GET /findings/top` | none | `ScoredFinding[]` |
| `getScoresSummary()` | `GET /findings/summary` | none | `ScoresSummary` |
| `getFindingsPage()` | `GET /findings` | page, page size, sort, source, risk band, search | `PaginatedFindings` |
| `getFindingDetails()` | `GET /findings/{finding_id}` | finding ID | `ScoredFinding` detail shape |
| `predictFindingFairLoss()` | `POST /findings/{finding_id}/fair-loss` | finding ID and FAIR request body | `FairLossPredictionResponse` |

Frontend finding types:

- `ScoredFinding`
- `PaginatedFindings`
- `ScoresSummary`
- `FindingsSortBy`
- `RiskBandFilter`

## Topology And Asset Contracts

| Function group | Routes | Inputs | Output |
| --- | --- | --- | --- |
| business units | `/topology/business-units*` | slugs, page/sort/filter for scoped findings | business-unit summaries, detail, risk overview, scoped findings |
| business services | `/topology/business-units/{bu}/business-services/{bs}*` | business-unit and service slugs | service detail, analytics, FAIR loss |
| applications | `/topology/business-units/{bu}/business-services/{bs}/applications/{app}*` | business-unit, service, and application slugs | application detail, FAIR frequency |
| assets | `/assets*` | topology filters, search, status, environment, compliance, direct-only, sort, page | asset pages, analytics, asset detail, asset findings |

Frontend topology types:

- `BusinessUnitSummary`
- `BusinessUnitDetail`
- `BusinessServiceSummary`
- `BusinessServiceDetail`
- `ApplicationSummary`
- `ApplicationDetail`
- `AssetSummary`
- `AssetDetail`
- `AssetFindingsPageResponse`
- `AssetAnalyticsResponse`

## Sources Contract

| Function | Route | Inputs | Output |
| --- | --- | --- | --- |
| `getSourcesSummary()` | `GET /sources` | none | `SourceSummary[]` |

The sources surface is read-only. Source create, rename, import, or delete helpers are not part of the active frontend contract.

## Controls And FAIR Contracts

| Function group | Routes | Inputs | Output |
| --- | --- | --- | --- |
| controls | `/controls/current`, `/controls/security-score`, `/controls/save`, `/controls/saved/latest` | control answers/security score body | `ControlAssessment` and security-score results |
| FAIR loss | finding, asset, application, and business-service FAIR routes | control context, iterations, and optional loss magnitude fields | `FairLossPredictionResponse` |

Business-service FAIR panels render monetary loss estimates. Application, asset, and finding panels render frequency/context metrics without monetary loss controls.

## Contract Rules

- `backend/app/schemas.py` is the source of truth for response DTO fields.
- `ScoredFinding` represents the shared frontend view of `FindingSummary` plus optional `FindingDetail` fields.
- Do not keep stale finding fields in frontend types unless the backend schema returns them.
- Date/time values arrive as serialized strings in the renderer.
- `AssetFindingsPageResponse` is the preferred frontend name for the asset findings page response. `AssetFindingsPage` remains a compatibility alias.
- When a backend response changes, update frontend types, API tests, hook tests, and affected component tests together.

## Current Notes

- The frontend is read-only with respect to findings, sources, and imports.
- Older routes for CSV import, source mutation, disposition writes, and risk-weight updates are not part of the active contract.
- `GET /findings/{finding_id}` returns persisted finding detail. Optional Brinqa narrative fields that are not in the schema should not be assumed in the UI.
- `GET /assets/{asset_id}` is DB-only and returns persisted asset metadata.
- `GET /assets/analytics` accepts the same non-pagination filters used by `GET /assets`: `business_unit`, `business_service`, `application`, `status`, `environment`, `compliance`, `search`, and `direct_only`.
- `GET /assets/{asset_id}/findings/analytics` powers asset-page summary cards and charts independent of table pagination.
- FAIR loss routes return prediction summaries for finding, asset, application, and business-service scopes.
- Controls routes return the current security assessment and computed security-score context.

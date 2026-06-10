# Frontend Hook Tests

These tests protect async hook state machines, refresh behavior, filters, pagination, and readable error handling.

## frontend/src/tests/hooks/dashboard/useDashboardOverviewData.test.ts

### Files Tested

- `frontend/src/hooks/dashboard/useDashboardOverviewData.ts`
- `frontend/src/api/findings.ts`
- `frontend/src/api/sources.ts`

### Cases Covered

- Loads summary data on mount.
- Combines findings summary and source summary data.
- Reloads when `refreshToken` changes.

### Edge Cases Covered

- Sets a readable error when loading fails.

### Not Covered Here

- Dashboard component rendering.
- Backend summary aggregation.

## frontend/src/tests/hooks/findings/useFindingDetails.test.ts

### Files Tested

- `frontend/src/hooks/findings/useFindingDetails.ts`
- `frontend/src/api/findings.ts`

### Cases Covered

- Loads finding details on mount.
- Preserves enriched/persisted detail fields from the API.
- Reloads when the finding ID changes.
- Reloads when `refreshToken` changes.

### Edge Cases Covered

- Stores thrown error messages.

### Not Covered Here

- Finding detail visual layout.
- Backend finding detail shaping.

## frontend/src/tests/hooks/findings/useFindingsExplorerState.test.ts

### Files Tested

- `frontend/src/hooks/findings/useFindingsExplorerState.ts`
- `frontend/src/hooks/findings/usePaginatedFindings.ts`

### Cases Covered

- Prepares findings explorer data.
- Applies local KEV filtering.
- Passes source and sort filters into paginated findings.

### Edge Cases Covered

- Local KEV filtering works independently from backend paging inputs.

### Not Covered Here

- Table rendering.
- Backend filtering semantics.

## frontend/src/tests/hooks/findings/usePaginatedFindings.test.ts

### Files Tested

- `frontend/src/hooks/findings/usePaginatedFindings.ts`
- `frontend/src/api/findings.ts`

### Cases Covered

- Loads all findings when risk-band filter is `All`.
- Loads risk-band filtered findings when a specific band is selected.
- Passes paging, sort, and source parameters.
- Resets page state when filters change.
- Reloads on `refreshToken` changes.

### Edge Cases Covered

- Sets error state on failed requests.
- Omits risk-band filtering for the `All` filter.

### Not Covered Here

- Component-level table controls.
- Backend query validation.

## frontend/src/tests/hooks/sources/useSourcesSummary.test.ts

### Files Tested

- `frontend/src/hooks/sources/useSourcesSummary.ts`
- `frontend/src/api/sources.ts`

### Cases Covered

- Loads source summaries on mount.
- Reloads when `refreshToken` changes.

### Edge Cases Covered

- Stores errors on failed requests.

### Not Covered Here

- Source card ordering.
- Backend source grouping.

## frontend/src/tests/hooks/topology/useAssetFindingsAnalytics.test.ts

### Files Tested

- `frontend/src/hooks/topology/assets/useAssetFindingsAnalytics.ts`
- `frontend/src/api/topology.ts`

### Cases Covered

- Loads analytics for the full filtered asset-findings result set.

### Edge Cases Covered

- Passes filters separately from table pagination.

### Not Covered Here

- Asset findings table rendering.
- Backend analytics aggregation.

## frontend/src/tests/hooks/topology/useAssetsAnalytics.test.ts

### Files Tested

- `frontend/src/hooks/topology/assets/useAssetsAnalytics.ts`
- `frontend/src/api/topology.ts`

### Cases Covered

- Loads analytics for the full filtered asset result set.

### Edge Cases Covered

- Keeps analytics filters aligned with asset inventory filters.

### Not Covered Here

- Chart rendering.
- Backend asset analytics aggregation.

## frontend/src/tests/hooks/topology/useBusinessUnitRiskOverview.test.ts

### Files Tested

- `frontend/src/hooks/topology/business-units/useBusinessUnitRiskOverview.ts`
- `frontend/src/api/topology.ts`

### Cases Covered

- Loads business-unit risk overview data.

### Edge Cases Covered

- Returns a not-found error when no business-unit slug is provided.

### Not Covered Here

- Business-unit risk chart rendering.
- Backend risk-overview calculation.

## frontend/src/tests/hooks/topology/useBusinessUnitTopFindings.test.ts

### Files Tested

- `frontend/src/hooks/topology/business-units/useBusinessUnitTopFindings.ts`
- `frontend/src/api/topology.ts`

### Cases Covered

- Loads scoped findings page with expected query parameters.
- Passes paging, sorting, source, risk-band, and search filters.

### Edge Cases Covered

- Returns a not-found error when no business-unit slug is provided.

### Not Covered Here

- Findings table rendering.
- Backend scoped findings SQL behavior.

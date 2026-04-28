# Frontend Hooks

## Active hooks

- `frontend/src/hooks/dashboard/useDashboardOverviewData.ts`
  Loads findings summary plus source summary for the dashboard header area.
- `frontend/src/hooks/findings/usePaginatedFindings.ts`
  Handles paging, sorting, band filtering, and source filtering for the main findings table.
- `frontend/src/hooks/findings/useFindingDetails.ts`
  Loads a single finding detail record.
- `frontend/src/hooks/sources/useSourcesSummary.ts`
  Loads the source summary list for dashboard filters and the sources page.
- `frontend/src/hooks/topology/useBusinessUnits.ts`
- `frontend/src/hooks/topology/useBusinessUnitDetail.ts`
- `frontend/src/hooks/topology/useBusinessServiceDetail.ts`
- `frontend/src/hooks/topology/useApplicationDetail.ts`
- `frontend/src/hooks/topology/usePaginatedAssets.ts`
- `frontend/src/hooks/topology/useAssetFindings.ts`
- `frontend/src/hooks/topology/useAssetEnrichment.ts`
  Loads Brinqa enrichment and triggers unauthorized recovery when the backend reports `unauthorized_token`.

## Removed from active surface

- Risk-weight hooks are no longer part of the active runtime.

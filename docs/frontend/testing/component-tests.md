# Frontend Component Tests

These tests protect page rendering, shared table behavior, drill-down entry points, and persisted-data UI expectations.

## frontend/src/tests/components/business-services/ApplicationDetailPage.test.tsx

### Files Tested

- `frontend/src/components/business-services/ApplicationDetailPage.tsx`
- `frontend/src/components/business-services/AssetInventoryPanel.tsx`
- `frontend/src/hooks/topology/applications/useApplicationDetail.ts`
- `frontend/src/hooks/topology/assets/useAssetsAnalytics.ts`
- `frontend/src/hooks/topology/assets/usePaginatedAssets.ts`

### Cases Covered

- Renders application metrics and assets in a sortable table.
- Exposes asset-findings entry points.
- Renders inventory controls for paginated asset lists.

### Edge Cases Covered

- Keeps application asset table behavior wired through mocked paginated inventory state.

### Not Covered Here

- Backend application detail route behavior.
- Real browser table overflow behavior.

## frontend/src/tests/components/business-services/AssetDistributionCharts.test.tsx

### Files Tested

- `frontend/src/components/business-services/AssetDistributionCharts.tsx`

### Cases Covered

- Renders asset distribution chart cards.
- Includes an unscored segment only when unscored data is present.

### Edge Cases Covered

- Suppresses unscored rows when the count is zero.

### Not Covered Here

- Recharts pixel rendering in a real browser.
- Backend analytics aggregation.

## frontend/src/tests/components/business-services/AssetFindingsPage.test.tsx

### Files Tested

- `frontend/src/components/business-services/AssetFindingsPage.tsx`
- `frontend/src/components/business-services/shared/FindingsExplorerPanel.tsx`
- `frontend/src/hooks/topology/assets/useAssetDetail.ts`
- `frontend/src/hooks/topology/assets/useAssetFindings.ts`
- `frontend/src/hooks/topology/assets/useAssetFindingsAnalytics.ts`

### Cases Covered

- Renders the compact asset-first findings layout from persisted asset metadata.
- Opens a finding from the asset findings table with route-origin context.
- Passes analytics filters without requesting live enrichment.
- Shows table rows in server-provided order.

### Edge Cases Covered

- Confirms old enrichment probe/run controls are absent.
- Confirms asset hero omits asset type and extra classification chips.

### Not Covered Here

- Backend asset findings SQL behavior.
- Live Brinqa enrichment fetches.

## frontend/src/tests/components/business-services/BusinessServiceDetailPage.test.tsx

### Files Tested

- `frontend/src/components/business-services/BusinessServiceDetailPage.tsx`
- `frontend/src/components/business-services/AssetInventoryPanel.tsx`
- `frontend/src/hooks/topology/assets/useAssetsAnalytics.ts`
- `frontend/src/hooks/topology/assets/usePaginatedAssets.ts`
- `frontend/src/hooks/topology/business-services/useBusinessServiceAnalytics.ts`
- `frontend/src/hooks/topology/business-services/useBusinessServiceDetail.ts`

### Cases Covered

- Renders application cards and direct assets in the explorer table.
- Preserves API order for direct assets.
- Displays service metrics, charts, FAIR panel, applications, and direct assets.

### Edge Cases Covered

- Handles direct assets separately from application assets.
- Keeps direct asset order aligned to backend/API ordering.

### Not Covered Here

- Business-service scoring math.
- Real chart layout.

## frontend/src/tests/components/business-services/BusinessServicesOverview.test.tsx

### Files Tested

- `frontend/src/components/business-services/BusinessServicesOverview.tsx`
- `useBusinessUnits`

### Cases Covered

- Renders company summary cards and business-unit tiles.
- Opens business-unit detail from a company card.
- Shows schema-not-initialized state for backend `503`.
- Shows generic company load failure state.

### Edge Cases Covered

- Distinguishes topology schema initialization errors from generic load failures.

### Not Covered Here

- Backend topology table creation.
- Business-unit detail rendering.

## frontend/src/tests/components/business-services/BusinessUnitDetailPage.test.tsx

### Files Tested

- `frontend/src/components/business-services/BusinessUnitDetailPage.tsx`
- `frontend/src/hooks/topology/business-units/useBusinessUnitDetail.ts`
- `frontend/src/hooks/topology/business-units/useBusinessUnitRiskOverview.ts`
- `frontend/src/hooks/topology/business-units/useBusinessUnitTopFindings.ts`

### Cases Covered

- Renders child business services from live business-unit detail data.
- Renders risk overview, metric cards, business services, and scoped findings table.
- Confirms removed secondary back button and old summary table are absent.

### Edge Cases Covered

- Handles KEV filter control presence and business-unit scoped finding data.

### Not Covered Here

- Backend business-unit rollup calculations.
- Full table interaction coverage; shared table tests cover generic behavior.

## frontend/src/tests/components/dashboard/FindingDetailPage.test.tsx

### Files Tested

- `frontend/src/components/dashboard/FindingDetailPage.tsx`
- `FindingDetailSections`
- `useFindingDetails`

### Cases Covered

- Renders dense finding detail layout with compact supporting details.
- Shows KEV details only for KEV findings and keeps them near the top.
- Avoids large empty remediation callouts when remediation narrative is absent.

### Edge Cases Covered

- Handles finding title normalization, asset/business context, and optional KEV fields.
- Keeps persisted details visible without requiring historical Brinqa-only fields.

### Not Covered Here

- Backend finding detail response generation.
- FAIR prediction internals.

## frontend/src/tests/components/dashboard/RiskTable.test.tsx

### Files Tested

- `frontend/src/components/dashboard/RiskTable.tsx`
- `frontend/src/components/findings/FindingsTable.tsx`
- `frontend/src/hooks/findings/usePaginatedFindings.ts`

### Cases Covered

- Keeps main findings page columns while using configurable table data.
- Renders score/status columns and row-open behavior through the table wrapper.

### Edge Cases Covered

- Confirms old vendor-risk column expectations stay removed.

### Not Covered Here

- Backend findings query behavior.
- Every generic table state; `DataTable.test.tsx` covers shared states.

## frontend/src/tests/components/findings/FindingsTable.test.tsx

### Files Tested

- `frontend/src/components/findings/FindingsTable.tsx`
- shared `DataTable` compatibility wrapper

### Cases Covered

- Renders only configured columns in configured order.
- Calls search, filter, sort, direction, and row-click handlers.
- Renders loading, error, and empty states.

### Edge Cases Covered

- Confirms wrapper behavior remains stable while the generic table owns rendering.

### Not Covered Here

- Domain-specific page data loading.
- Backend filters.

## frontend/src/tests/components/integrations/IntegrationsPage.test.tsx

### Files Tested

- `frontend/src/components/integrations/IntegrationsPage.tsx`
- `useSourcesSummary`

### Cases Covered

- Renders empty source state.
- Renders source cards in descending finding-count order.
- Renders the read-only runtime note.

### Edge Cases Covered

- Confirms no source mutation controls are exposed.

### Not Covered Here

- Backend source summary grouping.
- Source write flows.

## frontend/src/tests/components/shared/data-table/DataTable.test.tsx

### Files Tested

- `frontend/src/components/shared/data-table/DataTable.tsx`

### Cases Covered

- Renders arbitrary rows and configured columns.
- Supports search, select filters, toggles, sort controls, pagination, and row open.
- Renders loading, error, and empty states.
- Supports keyboard activation for row opening.

### Edge Cases Covered

- Applies score/info split styling from column group config.
- Handles disabled pagination boundaries.

### Not Covered Here

- Consumer-specific column definitions.
- Backend filtering or sorting.

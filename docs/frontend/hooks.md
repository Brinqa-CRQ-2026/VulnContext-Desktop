# Frontend Hooks Layer

This is the frontend hook overview.

The hooks layer sits on top of the API client and below the rendered components.

## Purpose

- Keep React loading and error state out of presentational components.
- Reuse the same data-loading behavior across pages and dashboard sections.
- Separate raw backend calls from frontend view-state orchestration.
- Mirror the grouped API layout where it helps readability.

## File layout

- `frontend/src/hooks/dashboard/useDashboardOverviewData.ts`
  Loads dashboard summary data and source summary data together for the overview section.

- `frontend/src/hooks/findings/usePaginatedFindings.ts`
  Loads paginated findings for the main table and handles:
  - page changes
  - risk band filter changes
  - sorting changes
  - source filter changes
  - refresh-trigger reloads

- `frontend/src/hooks/findings/useFindingDetails.ts`
  Loads one finding record by DB id for the detail page.

- `frontend/src/hooks/sources/useSourcesSummary.ts`
  Loads the source summary list used by source-management views and source filter controls.

- `frontend/src/hooks/risk-weights/useRiskWeightsConfig.ts`
  Loads current scoring weights for the risk weights editor.

- `frontend/src/hooks/topology/useBusinessUnits.ts`
  Loads the business-unit landing list.

- `frontend/src/hooks/topology/useBusinessUnitDetail.ts`
  Loads one business unit drill-down.

- `frontend/src/hooks/topology/useBusinessServiceDetail.ts`
  Loads one business service drill-down.

- `frontend/src/hooks/topology/useApplicationDetail.ts`
  Loads one application drill-down.

- `frontend/src/hooks/topology/usePaginatedAssets.ts`
  Loads paginated asset inventory results and resets page state when filters change.

- `frontend/src/hooks/topology/useAssetFindings.ts`
  Loads paginated asset findings results and handles:
  - page changes
  - search changes
  - source filter changes
  - risk band changes
  - KEV-only changes
  - sorting changes

## How the hooks differ from the API layer

- API modules know how to call the backend.
- Hooks know when to call the backend and how to manage loading/error state around those calls.
- API modules return raw request results.
- Hooks return frontend-ready state like:
  - `loading`
  - `error`
  - `data`
  - local setters when needed

## Current usage

### Dashboard

- `useDashboardOverviewData`
  Used by the dashboard overview panel to load:
  - findings summary
  - source summary list

### Findings views

- `usePaginatedFindings`
  Used by the main findings table.

- `useFindingDetails`
  Used by the finding detail page.

- `useAssetFindings`
  Used by the asset findings page under the topology drill-down flow.

### Sources views

- `useSourcesSummary`
  Used by:
  - source filter UI in the findings table
  - integrations/source management page

### Risk scoring views

- `useRiskWeightsConfig`
  Used by the risk scoring model editor.

### Topology views

- `useBusinessUnits`
  Used by the business-unit landing page.

- `useBusinessUnitDetail`
  Used by the business-unit detail page.

- `useBusinessServiceDetail`
  Used by the business-service detail page.

- `useApplicationDetail`
  Used by the application detail page.

- `usePaginatedAssets`
  Used by shared asset inventory panels in application and business-service pages.

## Design notes

- Hooks are grouped by feature area, not by generic React pattern.
- Hooks should own async effects, refresh token handling, and cancellation guards where needed.
- Components should stay focused on rendering and local interaction state.
- Main findings and asset findings now intentionally use parallel hook shapes so their pages can share filtering language without forcing identical presentation.

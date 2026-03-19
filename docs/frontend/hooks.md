# Frontend Hooks Layer

This is the lightweight frontend hook overview.

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

### Sources views

- `useSourcesSummary`
  Used by:
  - source filter UI in the findings table
  - integrations/source management page

### Risk scoring views

- `useRiskWeightsConfig`
  Used by the risk scoring model editor.

## Design notes

- Hooks are grouped by feature area, not by generic React pattern.
- Hooks should own async effects, refresh token handling, and cancellation guards where needed.
- Components should stay focused on rendering and local interaction state.
- If a hook starts containing formatting logic or presentational decisions, that is usually a sign it is taking on component responsibilities.
- If a hook becomes only a thin pass-through around one API call and is used once, it may not need to exist yet. The current split is based on repeated or page-level data needs.

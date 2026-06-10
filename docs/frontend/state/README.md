# Frontend State And Hooks

## Summary

Hooks own async loading state and small UI state machines. They should keep fetch behavior predictable and leave rendering to components.

The active hook index is now [Frontend Hooks](../hooks/README.md). This page remains as a compatibility overview for older docs links.

## Active Hook Areas

- `frontend/src/hooks/dashboard/useDashboardOverviewData.ts`
  Loads findings summary plus source summary for the dashboard header area.
- `frontend/src/hooks/findings/usePaginatedFindings.ts`
  Handles paging, sorting, band filtering, and source filtering for the main findings table.
- `frontend/src/hooks/findings/useFindingsExplorerState.ts`
  Coordinates dashboard findings explorer filters and pagination window state.
- `frontend/src/hooks/findings/useFindingDetails.ts`
  Loads a single finding detail record.
- `frontend/src/hooks/sources/useSourcesSummary.ts`
  Loads the source summary list for dashboard filters and the sources page.

## Topology Hooks

Topology hooks are split by domain:

- `frontend/src/hooks/topology/business-units/`
  Business-unit list, detail, risk overview, and top findings.
- `frontend/src/hooks/topology/business-services/`
  Business-service detail and analytics.
- `frontend/src/hooks/topology/applications/`
  Application detail.
- `frontend/src/hooks/topology/assets/`
  Asset detail, findings, findings analytics, inventory state, asset analytics, and paginated assets.

Keep existing hook names and return shapes stable unless all consumers and tests are updated together.

## Hook Conventions

- Return `loading`, `error`, and data consistently.
- Reset page state when filters or sort inputs change.
- Keep hook option object types local until reused.
- Keep desktop runtime actions in `frontend/src/runtime`, not in visual components.
- Do not put JSX or display formatting in hooks.

## Removed From Active Surface

Risk-weight hooks are no longer part of the active runtime.

## Related Docs

- [Frontend Hooks](../hooks/README.md)
- [Frontend Architecture](../architecture/README.md)
- [Frontend API Client](../api/README.md)
- [UI Patterns](../ui/README.md)

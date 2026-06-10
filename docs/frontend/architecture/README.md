# Frontend Architecture

## Summary

The frontend is a React/Electron renderer for vulnerability review, source summaries, topology drill-down workflows, FAIR loss views, and security-score controls.

## Folder Ownership

- `frontend/src/api/`
  Backend request modules only. Keep runtime fetch behavior here and import shared DTOs from `frontend/src/types`.
- `frontend/src/types/`
  Canonical shared frontend types. These mirror backend response schemas, plus small shared query/domain types.
- `frontend/src/hooks/`
  Async loading, pagination, filtering, and route-oriented state coordination. Hooks should not render UI.
- `frontend/src/pages/`
  Route-level page composition, app shell sections, and topology drill-down screens.
- `frontend/src/routing/`
  Renderer route parsing, route writing, and route-derived page metadata.
- `frontend/src/components/dashboard/`
  Dashboard summary cards, findings table, and finding detail presentation.
- `frontend/src/components/topology/`
  Reusable topology UI, asset inventory, charts, entity cards, metrics, and shared topology chrome.
- `frontend/src/components/integrations/`
  Read-only source-summary page.
- `frontend/src/components/controls/`
  Security-score assessment page and controls UI.
- `frontend/src/lib/`
  Shared formatting, sorting, chart, asset, finding, pagination, and topology helpers.
- `frontend/src/runtime/`
  Renderer helpers for Electron runtime actions such as desktop shutdown.

## Type Boundaries

`frontend/src/types` is the long-term source for shared types:

- `api.ts` contains backend response wrappers and DTOs such as `ScoredFinding`, `PaginatedFindings`, and asset findings analytics.
- `topology.ts` contains topology and asset entity shapes.
- `findings.ts` contains findings query and route-state types.
- `risk.ts`, `pagination.ts`, and `charts.ts` contain shared primitives.

`frontend/src/api/types.ts` exists only as a compatibility barrel. Do not add new type definitions there.

Component props should stay local when used once. Route-level topology screens belong in `frontend/src/pages/topology`. Feature-only topology table/chart types belong in `frontend/src/components/topology/types.ts`.

## Import Rules

- Import shared types from `frontend/src/types` or the specific module under it.
- API modules should import types from `../types`.
- Components and hooks should not import shared DTOs from `frontend/src/api/types`.
- Topology hooks are imported directly from their domain folder; do not add a topology hook barrel unless repeated imports become a real maintenance issue.

## Current High-Traffic Flows

- business-unit overview -> business-unit detail -> business-service detail -> optional application detail -> asset findings -> finding detail
- findings dashboard -> finding detail
- security score controls -> current assessment read/write
- sources summary page
- desktop launcher -> backend -> renderer -> Electron dashboard -> shutdown cleanup

## Page Structure

Each major page has a short behavior map in [Page Architecture](pages.md).

Use that page when changing route-level copy, drill-down navigation, page headers, or deciding where a new risk panel belongs.

## Related Docs

- [API Client](../api/README.md)
- [Data Contracts](../api/data-contracts.md)
- [Page Architecture](pages.md)
- [Components](../components/README.md)
- [Hooks](../hooks/README.md)
- [Types](../types/README.md)
- [State And Hooks](../state/README.md)
- [UI Patterns](../ui/README.md)
- [Frontend Style Guide](../ui/style-guide.md)
- [Desktop Runtime](../runtime/README.md)

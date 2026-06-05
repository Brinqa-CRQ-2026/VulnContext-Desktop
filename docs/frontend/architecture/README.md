# Frontend Architecture

## Summary

The frontend is a React/Electron renderer for read-only vulnerability review, source summaries, and topology drill-down workflows.

## Folder Ownership

- `frontend/src/api/`
  Backend request modules only. Keep runtime fetch behavior here and import shared DTOs from `frontend/src/types`.
- `frontend/src/types/`
  Canonical shared frontend types. These mirror backend response schemas, plus small shared query/domain types.
- `frontend/src/hooks/`
  Async loading, pagination, filtering, and route-oriented state coordination. Hooks should not render UI.
- `frontend/src/components/dashboard/`
  Dashboard summary cards, findings table, and finding detail presentation.
- `frontend/src/components/business-services/`
  Topology drill-down pages, asset inventory, asset findings, and topology shared UI.
- `frontend/src/components/integrations/`
  Read-only source-summary page.
- `frontend/src/lib/`
  Shared formatting, sorting, chart, asset, finding, pagination, and topology helpers.
- `frontend/src/auth/`
  Renderer auth helpers and Electron reset bridge for Brinqa session lifecycle.

## Type Boundaries

`frontend/src/types` is the long-term source for shared types:

- `api.ts` contains backend response wrappers and DTOs such as `ScoredFinding`, `PaginatedFindings`, and asset findings analytics.
- `topology.ts` contains topology and asset entity shapes.
- `findings.ts` contains findings query and route-state types.
- `risk.ts`, `pagination.ts`, and `charts.ts` contain shared primitives.

`frontend/src/api/types.ts` exists only as a compatibility barrel. Do not add new type definitions there.

Component props should stay local when used once. Feature-only business-services table/chart types belong in `frontend/src/components/business-services/types.ts`.

## Import Rules

- Import shared types from `frontend/src/types` or the specific module under it.
- API modules should import types from `../types`.
- Components and hooks should not import shared DTOs from `frontend/src/api/types`.
- Topology hooks are imported directly from their domain folder; do not add a topology hook barrel unless repeated imports become a real maintenance issue.

## Current High-Traffic Flows

- business-unit overview -> business-unit detail -> business-service detail -> optional application detail -> asset findings -> finding detail
- findings dashboard -> finding detail
- sources summary page
- desktop launcher -> backend -> renderer -> Electron -> logout/shutdown cleanup

## Related Docs

- [API Client](../api/README.md)
- [Data Contracts](../api/data-contracts.md)
- [State And Hooks](../state/README.md)
- [UI Patterns](../ui/README.md)
- [Frontend Style Guide](../ui/style-guide.md)
- [Desktop Runtime And Brinqa Auth](../runtime/README.md)

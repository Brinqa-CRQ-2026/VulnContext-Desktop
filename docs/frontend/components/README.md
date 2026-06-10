# Frontend Components

## Summary

Frontend components render page UI and shared operational controls. They should receive already-loaded data from hooks or parent pages and avoid direct API calls.

## Component Areas

| Area | Files | Purpose |
| --- | --- | --- |
| App shell | `frontend/src/app.tsx`, `components/layout/` | route state, top headers, navigation, desktop shutdown |
| Dashboard/findings | `components/dashboard/`, `components/findings/` | dashboard summary, findings table, finding detail |
| Topology | `components/business-services/` | company, business-unit, service, application, asset pages |
| Shared data table | `components/shared/data-table/` | generic searchable/filterable/sortable table shell |
| FAIR | `components/fair/` | FAIR loss and event-frequency panels |
| Sources | `components/integrations/` | read-only source summary page |
| Controls | `components/controls/` | security-score assessment page |
| UI primitives | `components/ui/` | local shadcn-style primitives used by pages |

## Ownership Rules

- Page components can own route-specific filter state and compose hooks.
- Shared components should be generic and receive configuration through props.
- API calls belong in `frontend/src/api` and hooks, not visual components.
- Shared UI primitives should stay domain-neutral.
- Domain-specific shared components belong near the domain unless they are reused across unrelated areas.

## Detailed Component Docs

- [Data Table](data-table.md)
- [Topology Pages](topology-pages.md)
- [Finding Detail](finding-detail.md)

## Testing Docs

- [Component Tests](../testing/component-tests.md)
- [App Routing Tests](../testing/app-routing-tests.md)

# Frontend UI Patterns

## Summary

The UI is an operational desktop interface. It should be dense, readable, and built for repeated vulnerability review workflows.

## Dashboard Area

`frontend/src/components/dashboard/` contains:

- summary cards and charts
- the main findings table
- finding detail UI

Finding detail UI should only render fields returned by the backend finding schemas. Avoid carrying historical Brinqa-only fields in the frontend contract.

## Topology Area

`frontend/src/pages/topology/` contains the route-level topology screens:

- business-unit overview and detail
- business-service detail
- application detail
- asset findings drill-down

`frontend/src/components/topology/` contains reusable topology UI:

- asset distribution charts
- asset inventory
- breadcrumb helpers and shared topology chrome

Reusable topology pieces live under `frontend/src/components/topology/shared/`. Use this folder for repeated cards, panels, entity headers, badges, and findings explorer UI.

Feature-level topology view types live in `frontend/src/components/topology/types.ts`.

## Sources Area

`frontend/src/components/integrations/IntegrationsPage.tsx` is a read-only source-summary page.

It does not expose import, rename, or delete controls because the backend does not currently serve those write routes.

## App Shell

`frontend/src/components/layout/Header.tsx` contains desktop runtime controls.

Current behavior:

- `Shut Down` exits the desktop runtime.
- normal window close follows the same shutdown path as `Shut Down`.

These controls are runtime lifecycle actions, not just navigation.

## Removed From Active Surface

The risk-weight editor and CSV empty-state importer are not part of the active component surface.

## Related Docs

- [Frontend Style Guide](style-guide.md)
- [Frontend Architecture](../architecture/README.md)
- [Components](../components/README.md)
- [Frontend Hooks](../hooks/README.md)

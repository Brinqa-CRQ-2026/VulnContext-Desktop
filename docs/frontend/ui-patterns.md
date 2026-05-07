# Frontend UI Patterns

The UI is an operational desktop interface. It should be dense, readable, and built for repeated vulnerability review workflows.

## Dashboard Area

`frontend/src/components/dashboard/` contains:

- summary cards and charts
- the main findings table
- finding detail UI

Finding detail UI should only render fields returned by the backend finding schemas. Avoid carrying historical Brinqa-only fields in the frontend contract.

## Topology Area

`frontend/src/components/business-services/` contains:

- business-unit overview and detail
- business-service detail
- application detail
- asset distribution charts
- asset inventory and asset findings drill-down
- breadcrumb helpers and shared topology chrome

Reusable topology pieces live under `frontend/src/components/business-services/shared/`. Use this folder for repeated cards, panels, entity headers, badges, summary tables, and findings explorer UI.

Feature-level business-services view types live in `frontend/src/components/business-services/types.ts`.

## Sources Area

`frontend/src/components/integrations/IntegrationsPage.tsx` is a read-only source-summary page.

It does not expose import, rename, or delete controls because the backend does not currently serve those write routes.

## App Shell

`frontend/src/components/layout/Header.tsx` contains desktop runtime controls.

Current behavior:

- `Log Out` clears Brinqa auth/session state and returns to the login flow without shutting down backend or renderer.
- `Shut Down` performs the same Brinqa cleanup and then exits the desktop runtime.
- normal window close follows the same shutdown path as `Shut Down`.

These controls are runtime lifecycle actions, not just navigation.

## Removed From Active Surface

The risk-weight editor and CSV empty-state importer are not part of the active component surface.

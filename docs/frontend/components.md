# Frontend Components

## Dashboard area

`frontend/src/components/dashboard/` contains:

- summary cards and charts
- the main findings table
- finding detail UI

The removed risk-weight editor and CSV empty-state importer are not part of the active component surface anymore.

## Topology area

`frontend/src/components/business-services/` contains:

- business unit overview and detail
- business service detail
- application detail
- asset inventory and asset findings drill-down
- breadcrumb helpers and shared topology chrome

## Sources area

`frontend/src/components/integrations/IntegrationsPage.tsx` is now a read-only source-summary page.

It does not expose import, rename, or delete controls because the backend does not currently serve those write routes.

## App shell

`frontend/src/components/layout/Header.tsx` contains the desktop runtime controls.

Current behavior:

- `Log Out` clears Brinqa auth/session state and returns to the login flow without shutting down backend or renderer
- `Shut Down` performs the same Brinqa cleanup and then exits the desktop runtime
- normal window close follows the same shutdown path as `Shut Down`

These controls are part of runtime lifecycle, not just UI navigation.

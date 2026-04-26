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

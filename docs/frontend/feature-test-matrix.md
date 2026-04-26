# Frontend Feature And Test Matrix

## Current suite

- API tests cover the active read-only findings, sources, topology, and shared client modules.
- Hook tests cover dashboard, findings, topology, and source-summary loading behavior.
- App-shell tests cover routing through findings, sources, and topology drill-down paths.
- Component tests cover active page components such as integrations/source summary and topology pages.

## Explicitly removed from test scope

The suite no longer needs direct coverage for:

- CSV import API wrappers
- risk-weight APIs or hooks
- finding disposition write helpers
- source rename/delete helpers

Those features are not part of the active runtime.

# Frontend Components

This is the frontend components overview.

## Purpose

The components layer holds the rendered UI for the desktop app.

It is split by feature area so page sections stay easier to find and change.

## Main component folders

- `frontend/src/components/dashboard/`
  Main findings experience and primary analyst workflow UI.
  This area covers:
  - dashboard summary and overview sections
  - findings charts and summary cards
  - the main findings table and filtering workflow
  - finding detail views with breadcrumb-aware read-only drill-down
  - the risk scoring editor
  - the current empty/import state used when no findings exist yet

- `frontend/src/components/business-services/`
  Topology drill-down UI.
  This area covers:
  - business-unit overview and detail pages
  - business-service and application drill-down pages
  - asset inventory lists with shared search/filter/sort controls
  - asset findings table with server-backed pagination and findings-style filters
  - shared topology breadcrumbs, page skeletons, and drill-down table shells

- `frontend/src/components/integrations/`
  Source management and import-related UI.
  This area is where the user manages imported data sources after data enters the app.
  It covers:
  - source inventory views
  - source rename and delete actions
  - source-level summary cards
  - the import entry point used to add staged CSV data

- `frontend/src/components/layout/`
  Shared layout structure used across the app shell.

- `frontend/src/components/ui/`
  Shared reusable interface primitives such as buttons, cards, tables, inputs, sheets, pagination, and other low-level pieces.

## Important current page patterns

- The main findings table is the richer analyst view for all findings.
- Scoped asset findings reuses the same filter language, but remains attached to one asset and pages through `/assets/{asset_id}/findings`.
- Asset, application, and business-service inventory lists share one search/sort/pagination pattern through the same inventory panel.
- Finding detail supports two breadcrumb origins:
  - global findings
  - topology asset drill-down

## How this fits with the rest of the frontend

- Components render the UI.
- Hooks provide loaded data and async state.
- API modules provide backend calls.
- `lib` holds small shared helpers like finding-title normalization.

## Design note

The component folders are grouped by app area first, then by reusable UI primitives, so the dashboard and topology drill-down features can evolve independently without turning into one flat shared-components directory.

# Frontend Components

This is the brief frontend components overview.

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
  - finding detail views
  - the risk scoring editor
  - the current empty/import state used when no findings exist yet

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

## How this fits with the rest of the frontend

- Components render the UI.
- Hooks provide loaded data and async state.
- API modules provide backend calls.
- `lib` holds small shared helpers.

## Design note

The component folders are intentionally grouped by app area first, then by reusable UI primitives, instead of putting every component type into one flat folder.

The `dashboard` area is currently the most developed feature section and is already reasonably broken into focused components.

The `integrations` area is still smaller and more consolidated, so more of its behavior lives in one main page component today. That is acceptable for the current size of the feature, but it is the most likely area to be split further if the source-management workflow grows.

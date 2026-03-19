# Frontend API Layer

This is the lightweight frontend API client overview.

The frontend API layer is now split by backend route group instead of keeping every request in one file.

## Purpose

- Keep raw backend calls in one place.
- Match the backend router split so frontend imports are easier to follow.
- Reuse shared response parsing and base URL logic.
- Keep React hooks and components from owning fetch details directly.

## File layout

- `frontend/src/api/client.ts`
  Shared transport helpers. Resolves the backend base URL and centralizes JSON success/error parsing.

- `frontend/src/api/types.ts`
  Shared TypeScript types for API responses and payloads.

- `frontend/src/api/findings.ts`
  Findings-related API calls:
  - top findings
  - dashboard summary
  - paginated findings
  - finding detail
  - disposition set and clear

- `frontend/src/api/sources.ts`
  Source-related API calls:
  - source summary list
  - rename source
  - delete source

- `frontend/src/api/imports.ts`
  Import-related API calls:
  - staged CSV upload for findings import

- `frontend/src/api/risk-weights.ts`
  Risk scoring configuration API calls:
  - load current weights
  - update weights

- `frontend/src/api/index.ts`
  Barrel export so components can import from one frontend API entry when that is more convenient.

## How it is used

- Components should not call `fetch` directly for backend routes.
- Hooks usually call these API modules and own loading, error, and refresh behavior.
- Components can import directly from grouped files when the dependency should stay explicit.
- Shared API types come from `types.ts` so the frontend uses the same shapes across components and hooks.

## Current endpoint groups

### Findings

Used by:
- dashboard summary views
- findings table
- finding detail page
- disposition workflows

Main functions:
- `getTopScores`
- `getScoresSummary`
- `getAllFindings`
- `getFindingsByRiskBand`
- `getFindingById`
- `setFindingDisposition`
- `clearFindingDisposition`

### Sources

Used by:
- source filter controls
- integrations/source management page

Main functions:
- `getSourcesSummary`
- `renameSource`
- `deleteSource`

### Imports

Used by:
- empty-state import flow
- integrations import flow

Main function:
- `seedQualysCsv`

### Risk Weights

Used by:
- scoring model editor

Main functions:
- `getRiskWeights`
- `updateRiskWeights`

## Design notes

- `client.ts` is the only place that should know how the frontend derives the backend base URL.
- `parseJsonOrThrow` keeps API error handling consistent so hooks and components can surface clean messages.
- `types.ts` is intentionally broad because the finding detail and findings table use many of the same fields.
- This layer should stay focused on request/response work only. UI state and refresh coordination belong in hooks.

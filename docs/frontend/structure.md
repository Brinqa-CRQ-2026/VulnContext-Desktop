# Frontend Structure

This is the brief frontend structure overview.

## Main folders

- `frontend/src/`
  Main frontend application source.

- `frontend/src/api/`
  Frontend backend-client layer, grouped by backend route area.

- `frontend/src/hooks/`
  React hooks for data loading and page-level state coordination.

- `frontend/src/components/`
  Reusable UI building blocks and page sections.

- `frontend/src/lib/`
  Small shared frontend helpers.

## Component subfolders

- `frontend/src/components/dashboard/`
  Findings and dashboard UI.

- `frontend/src/components/integrations/`
  Source/import management UI.

- `frontend/src/components/layout/`
  Shared layout pieces like navigation and page framing.

- `frontend/src/components/ui/`
  Reusable low-level UI primitives.

## Hook subfolders

- `frontend/src/hooks/dashboard/`
  Dashboard-focused hooks.

- `frontend/src/hooks/findings/`
  Findings table and detail hooks.

- `frontend/src/hooks/sources/`
  Source-summary hooks.

- `frontend/src/hooks/risk-weights/`
  Scoring-model hooks.

## Root frontend files

At the root of `frontend/`, the extra config and setup files support Electron, Vite, TypeScript, Tailwind, and package/build setup.

Examples:
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `components.json`
- `electron-main.ts`
- `index.html`

These are important for app setup and builds, but they are not part of the day-to-day feature folder structure.

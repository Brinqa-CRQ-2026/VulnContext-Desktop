# Frontend Structure

## Main folders

- `frontend/src/api/`
  Read-only backend client modules and shared types.
- `frontend/src/hooks/`
  Async loading and route-oriented state coordination.
- `frontend/src/components/dashboard/`
  Dashboard summary, findings table, and finding detail UI.
- `frontend/src/components/business-services/`
  Topology drill-down views.
- `frontend/src/components/integrations/`
  Current source-summary page.
- `frontend/src/components/layout/`
  App shell and navigation.
- `frontend/src/components/ui/`
  Shared UI primitives.
- `frontend/src/lib/`
  Small utility helpers.

## Current high-traffic flows

- business-unit overview -> business service -> optional application -> asset findings -> finding detail
- findings dashboard -> finding detail
- sources summary page

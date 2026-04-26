# Frontend Structure

## Main folders

- `frontend/src/auth/`
  Brinqa auth parsing, token inspection, and renderer storage helpers used by the Electron shell.
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

## Electron shell

- `frontend/electron-main.ts`
  Owns the Electron desktop shell, Brinqa login window, MFA interception, and startup auth routing.
- [docs/frontend/auth-shell.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/frontend/auth-shell.md)
  Explains the Brinqa login shell, token storage, expiry handling, and ownership boundary.

## Current high-traffic flows

- business-unit overview -> business service -> optional application -> asset findings -> finding detail
- findings dashboard -> finding detail
- sources summary page

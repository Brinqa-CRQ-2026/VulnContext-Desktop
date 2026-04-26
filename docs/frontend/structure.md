# Frontend Structure

## Main folders

- `frontend/src/auth/`
  Brinqa auth parsing, token inspection, renderer reset helpers, and remote logout helpers used by the Electron shell.
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
  Owns the Electron desktop shell, Brinqa login window, MFA interception, runtime shutdown, and auth routing.
- `frontend/src/preload.ts`
  Exposes the renderer-to-Electron auth bridge used by logout, shutdown, and unauthorized recovery flows.
- `scripts/run-desktop.sh`
  Starts backend, waits for readiness, starts Vite, starts Electron, and shuts child processes down when Electron exits.
- [docs/frontend/desktop-runtime-and-auth.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/frontend/desktop-runtime-and-auth.md)
  Explains the desktop runtime, Brinqa auth/session lifecycle, and shutdown behavior.

## Current high-traffic flows

- business-unit overview -> business service -> optional application -> asset findings -> finding detail
- findings dashboard -> finding detail
- sources summary page
- desktop launcher -> backend -> renderer -> Electron -> logout/shutdown cleanup

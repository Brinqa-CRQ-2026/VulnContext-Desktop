# Desktop Runtime

## Summary

The desktop app starts directly in the local dashboard.

The supported primary startup path is:

```bash
make desktop
```

## Main files

- [scripts/run-desktop.sh](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/scripts/run-desktop.sh)
  Starts backend, waits for readiness, starts Vite, starts Electron, and tears child processes down when Electron exits.
- [frontend/electron-main.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/electron-main.ts:1)
  Owns the Electron dashboard window lifecycle.
- [frontend/src/preload.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/preload.ts:1)
  Exposes the minimal renderer-to-Electron desktop bridge.
- [frontend/src/runtime/desktopBridge.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/runtime/desktopBridge.ts:1)
  Provides the renderer helper for desktop shutdown.

## Desktop launcher flow

1. `make desktop` runs the local desktop launcher.
2. The launcher builds the Electron main process code.
3. The launcher starts the backend on `127.0.0.1:8000` or the next free localhost port.
4. The launcher waits for backend readiness.
5. The launcher starts the Vite renderer on `127.0.0.1:5173` or the next free localhost port.
6. The launcher waits for renderer readiness.
7. The launcher starts Electron directly on the dashboard.
8. When Electron exits, the launcher stops the backend and renderer child processes.

If Electron does not open, restart from the repo root and check the launcher output for the selected backend and renderer ports.

## Legacy Auth Context

Historical context for the removed auth flow is kept in
[Legacy Brinqa Auth](legacy-brinqa-auth.md).

## Related Docs

- [Frontend Architecture](../architecture/README.md)
- [Frontend API Client](../api/README.md)
- [Frontend Test Matrix](../testing/README.md)

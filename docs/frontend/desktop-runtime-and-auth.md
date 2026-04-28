# Desktop Runtime And Brinqa Auth

## Purpose

The desktop app uses an Electron-owned Brinqa auth shell and a launcher-managed local runtime.

This runtime is responsible for:

- starting the local FastAPI backend
- starting the Vite renderer
- opening the Electron desktop shell
- capturing Brinqa MFA responses
- extracting and storing the Brinqa token for renderer use
- clearing Brinqa auth/session state on logout, shutdown, and normal window close

The supported primary startup path is:

```bash
make desktop
```

## Main files

- [scripts/run-desktop.sh](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/scripts/run-desktop.sh)
  Starts backend, waits for readiness, starts Vite, starts Electron, and tears child processes down when Electron exits.
- [frontend/electron-main.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/electron-main.ts:1)
  Owns Electron window lifecycle, Brinqa MFA interception, token/session reset, and shutdown behavior.
- [frontend/src/preload.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/preload.ts:1)
  Exposes the minimal renderer-to-Electron auth bridge.
- [frontend/src/auth/brinqaAuth.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/auth/brinqaAuth.ts:1)
  Token extraction, expiry inspection, and renderer storage helpers.
- [frontend/src/auth/electronBrinqa.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/auth/electronBrinqa.ts:1)
  Renderer reset helper that calls Electron for logout, unauthorized recovery, and shutdown.
- [frontend/src/auth/brinqaRemoteLogout.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/auth/brinqaRemoteLogout.ts:1)
  Best-effort Brinqa `resetSession` and `logout` requests.

## Desktop launcher flow

1. `make desktop` runs the local desktop launcher.
2. The launcher builds the Electron main process code.
3. The launcher starts the backend on `127.0.0.1:8000`.
4. The launcher waits for backend readiness.
5. The launcher starts the Vite renderer on `127.0.0.1:5173`.
6. The launcher waits for renderer readiness.
7. The launcher starts Electron.
8. When Electron exits, the launcher stops the backend and renderer child processes.

If Electron does not open, first ensure ports `8000` and `5173` are free and restart from the repo root.

## Startup auth flow

1. Electron starts and registers listeners for Brinqa MFA requests.
2. A hidden bootstrap window loads the renderer and reads `brinqaMfaResponse` and `brinqaAuthToken` from renderer `localStorage`.
3. If the stored token is JWT-shaped, Electron decodes the `exp` claim.
4. If the stored token is expired, Electron clears stored auth state and opens the Brinqa login window.
5. If a stored token is still usable, Electron opens the dashboard directly.
6. If there is no token, Electron opens the Brinqa login window.

## MFA capture and token handling

Current behavior:

- Electron watches the Brinqa MFA response
- the shell looks for token-like fields such as `token`, `access_token`, `accessToken`, `id_token`, and `idToken`
- the MFA payload and extracted token are stored in renderer `localStorage`
- enrichment requests forward the stored token to the backend with `X-Brinqa-Auth-Token`

Current limitation:

- opaque tokens are still treated as usable at startup unless a later Brinqa-backed request returns `unauthorized_token`

## Session reset behavior

The app supports three reset paths:

- `Log Out`
  Clears Brinqa auth/session state and returns to the Brinqa login window while keeping the desktop runtime running.
- `Shut Down`
  Clears Brinqa auth/session state, quits Electron, and lets the launcher stop backend and renderer.
- normal window close
  Uses the same shutdown path as `Shut Down`.

Current reset sequence:

1. attempt Brinqa `resetSession`
2. attempt Brinqa `logout`
3. clear renderer auth state
4. clear Electron Brinqa cookies and site storage
5. either reopen login or quit the app, depending on the trigger

Remote Brinqa logout is best-effort. Local cleanup is mandatory even if Brinqa logout fails.

## Unauthorized recovery

The frontend uses the existing asset enrichment status as the recovery signal for dead Brinqa sessions.

Current behavior:

- `useAssetEnrichment` treats `unauthorized_token` as a dead Brinqa session
- the renderer calls the Electron reset bridge
- local auth is cleared
- the app returns to the Brinqa login flow

This avoids leaving the app stuck with a stale token after Brinqa invalidates the session.

## Ownership boundary

This logic lives in frontend/Electron code because the desktop shell currently owns the Brinqa session.

Keep this in frontend/Electron while:

- Electron opens the Brinqa login page directly
- Electron captures MFA responses directly
- the token is stored in renderer state
- Brinqa cookies and site storage are cleared by Electron
- app exit must tear down both the desktop runtime and the Brinqa session

Move this to the backend only if the architecture changes so that:

- the backend performs Brinqa auth or token exchange
- the backend stores and validates the Brinqa session
- the frontend no longer owns Brinqa browser state
- Brinqa API access is backend-mediated

## Validation notes

- Automated coverage exists for the auth bridge, unauthorized reset flow, and header-triggered logout/shutdown actions.
- `Log Out` and `Shut Down` were manually verified by the user.
- Normal window close was later aligned to the same shutdown path as `Shut Down`.

# Frontend Auth Shell

## Purpose

The desktop app uses an Electron-owned Brinqa login shell rather than a backend-owned auth flow.

This shell is responsible for:

- opening the Brinqa login page
- watching the MFA response
- extracting a token from the MFA response payload when present
- storing the MFA payload and token in renderer `localStorage`
- checking token expiry on startup
- clearing stale auth state and forcing a fresh login when the stored token is expired

The React app itself does not call Brinqa directly for findings or topology data. Its normal data path is still the local FastAPI backend.

## Main files

- [frontend/electron-main.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/electron-main.ts:1)
  Electron window lifecycle, startup routing, Brinqa login window, MFA network interception.
- [frontend/src/auth/brinqaAuth.ts](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/frontend/src/auth/brinqaAuth.ts:1)
  Brinqa auth helpers for token extraction, expiry inspection, stored auth parsing, and renderer-side storage scripts.

## Startup flow

1. Electron starts and registers listeners for Brinqa MFA requests.
2. A hidden bootstrap window loads the dashboard renderer.
3. The shell reads `brinqaMfaResponse` and `brinqaAuthToken` from renderer `localStorage`.
4. If the stored token is JWT-shaped, the shell decodes the payload and reads `exp`.
5. If the token is expired, the shell clears stored auth state and opens the Brinqa login window.
6. If the token is still usable, the shell opens the dashboard directly.
7. If there is no token, the shell opens the Brinqa login window.

## Token handling

Current behavior:

- the shell looks for token-like fields such as `token`, `access_token`, `accessToken`, `id_token`, and `idToken`
- if the stored token is a JWT, the shell can determine expiry from the `exp` claim
- if the token is opaque, the shell cannot infer expiry from the token string alone

Current limitation:

- opaque tokens are treated as not-expired unless a separate authenticated probe is added

If Brinqa always returns JWTs in this flow, the current startup check is sufficient for expiry-driven reset. If Brinqa sometimes returns opaque tokens, add a lightweight authenticated validation request and clear local auth state on `401` or `403`.

## Ownership boundary

This logic lives in frontend/Electron code because the frontend shell currently owns the Brinqa session.

Keep this in frontend code when:

- Electron opens the Brinqa login page directly
- Electron captures the MFA response directly
- the token is stored locally in renderer state
- the backend is not the source of truth for Brinqa session lifecycle

Move this to the backend only if the architecture changes so that:

- the backend performs Brinqa auth or token exchange
- the backend stores and validates the Brinqa session
- the frontend never directly manages the Brinqa token
- Brinqa API access is backend-mediated

## Recommended future additions

- add an explicit sign-out/reset-auth action that clears both stored keys
- add an optional startup probe for opaque-token validation
- keep auth helpers in `frontend/src/auth/` and keep Electron process wiring in `frontend/electron-main.ts`

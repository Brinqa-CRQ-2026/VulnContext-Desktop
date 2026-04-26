import {
  brinqaTokenStorageKey,
  readStoredAuthStateFromLocalStorage,
  mfaResponseStorageKey,
} from "./brinqaAuth";
import type {
  BrinqaDesktopAuthApi,
  BrinqaResetRequest,
} from "./brinqaDesktopBridge";

declare global {
  interface Window {
    brinqaDesktopAuth?: BrinqaDesktopAuthApi;
  }
}

export function clearBrinqaAuthStateFromRenderer() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(mfaResponseStorageKey);
  window.localStorage.removeItem(brinqaTokenStorageKey);
}

let pendingSessionReset: Promise<void> | null = null;

export async function requestBrinqaSessionReset(request: BrinqaResetRequest) {
  const authState = readStoredAuthStateFromLocalStorage();
  if (
    request.reason === "unauthorized"
    && !authState.authToken
    && !authState.mfaResponse
  ) {
    return;
  }

  if (!window.brinqaDesktopAuth) {
    clearBrinqaAuthStateFromRenderer();
    return;
  }

  if (!pendingSessionReset) {
    pendingSessionReset = window.brinqaDesktopAuth.resetSession(request).finally(() => {
      pendingSessionReset = null;
    });
  }

  await pendingSessionReset;
  clearBrinqaAuthStateFromRenderer();
}

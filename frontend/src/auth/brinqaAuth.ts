import type { BrinqaDesktopAuthApi } from "./brinqaDesktopBridge";

export const mfaResponseStorageKey = "brinqaMfaResponse";
export const brinqaTokenStorageKey = "brinqaAuthToken";

export type StoredAuthState = {
  mfaResponse: string | null;
  authToken: string | null;
};

export type TokenDescription = {
  format: "missing" | "opaque" | "jwt";
  expiresAt: number | null;
  expired: boolean;
};

type JwtPayload = {
  exp?: number;
  iat?: number;
  nbf?: number;
  [key: string]: unknown;
};

export function tryParseJson(body: string) {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractTokenValue(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null;
  }

  const candidateKeys = ["token", "access_token", "accessToken", "id_token", "idToken"];

  for (const key of candidateKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function tryDecodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(segments[1])) as JwtPayload;
  } catch {
    return null;
  }
}

function isUnixTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getTokenExpiryTimestamp(token: string): number | null {
  const payload = tryDecodeJwtPayload(token);
  if (!payload || !isUnixTimestamp(payload.exp)) {
    return null;
  }

  return payload.exp * 1000;
}

export function describeToken(token: string | null): TokenDescription {
  if (!token) {
    return {
      format: "missing" as const,
      expiresAt: null,
      expired: true,
    };
  }

  const expiresAt = getTokenExpiryTimestamp(token);
  if (expiresAt === null) {
    return {
      format: "opaque" as const,
      expiresAt: null,
      expired: false,
    };
  }

  return {
    format: "jwt" as const,
    expiresAt,
    expired: expiresAt <= Date.now(),
  };
}

export function readStoredAuthStateFromLocalStorage(): StoredAuthState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { mfaResponse: null, authToken: null };
  }

  return {
    mfaResponse: window.localStorage.getItem(mfaResponseStorageKey),
    authToken: window.localStorage.getItem(brinqaTokenStorageKey),
  };
}

export function isUiOnlyModeEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const api = (window as Window & { brinqaDesktopAuth?: BrinqaDesktopAuthApi }).brinqaDesktopAuth;
  return api?.isUiOnlyMode?.() ?? false;
}

export function buildStoredBrinqaAuthHeaders(): Record<string, string> {
  if (isUiOnlyModeEnabled()) {
    return {};
  }

  const { authToken } = readStoredAuthStateFromLocalStorage();
  if (!authToken) {
    return {};
  }

  return {
    "X-Brinqa-Auth-Token": authToken,
  };
}

export function buildStorageSnapshotScript() {
  return `
    JSON.stringify({
      mfaResponse: window.localStorage.getItem(${JSON.stringify(mfaResponseStorageKey)}),
      authToken: window.localStorage.getItem(${JSON.stringify(brinqaTokenStorageKey)})
    });
  `;
}

export function parseStoredAuthState(rawValue: unknown): StoredAuthState {
  if (typeof rawValue !== "string") {
    return { mfaResponse: null, authToken: null };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredAuthState>;
    return {
      mfaResponse: typeof parsed.mfaResponse === "string" ? parsed.mfaResponse : null,
      authToken: typeof parsed.authToken === "string" ? parsed.authToken : null,
    };
  } catch {
    return { mfaResponse: null, authToken: null };
  }
}

export function buildDashboardStorageScript(mfaResponseBody: string) {
  const parsedPayload = tryParseJson(mfaResponseBody);
  const extractedToken = extractTokenValue(parsedPayload);

  return `
    window.localStorage.setItem(${JSON.stringify(mfaResponseStorageKey)}, ${JSON.stringify(mfaResponseBody)});
    ${
      extractedToken
        ? `window.localStorage.setItem(${JSON.stringify(brinqaTokenStorageKey)}, ${JSON.stringify(extractedToken)});`
        : ""
    }
  `;
}

export function buildDashboardLogoutScript() {
  return `
    window.localStorage.removeItem(${JSON.stringify(mfaResponseStorageKey)});
    window.localStorage.removeItem(${JSON.stringify(brinqaTokenStorageKey)});
  `;
}

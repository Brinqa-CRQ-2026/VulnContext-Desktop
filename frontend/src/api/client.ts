import { buildStoredBrinqaAuthHeaders } from "../auth/brinqaAuth";

export type ApiTimingEntry = {
  id: number;
  method: string;
  url: string;
  pathname: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  status: number | null;
  ok: boolean;
};

declare global {
  interface Window {
    __VC_API_TIMINGS__?: ApiTimingEntry[];
    __VC_API_TIMING_SEQ__?: number;
  }
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
}

const API_BASE_URL = getApiBaseUrl();

export function buildApiUrl(path: string, params?: URLSearchParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const query = params?.toString();
  return query ? `${API_BASE_URL}${normalizedPath}?${query}` : `${API_BASE_URL}${normalizedPath}`;
}

export function buildBrinqaEnrichmentRequestInit(): RequestInit | undefined {
  const headers = buildStoredBrinqaAuthHeaders();
  return Object.keys(headers).length > 0 ? { headers } : undefined;
}

function shouldRecordApiTimings(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("vcApiTimings") === "1" || window.localStorage?.getItem("vcApiTimings") === "1";
  } catch {
    return false;
  }
}

function recordApiTiming(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  startedAt: number,
  response: Response | null
) {
  if (!shouldRecordApiTimings() || typeof window === "undefined") {
    return;
  }

  const endedAt = performance.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
  let pathname = url;
  try {
    const parsed = new URL(url, window.location.href);
    pathname = `${parsed.pathname}${parsed.search}`;
  } catch {
    // Keep the raw URL.
  }

  window.__VC_API_TIMINGS__ = window.__VC_API_TIMINGS__ ?? [];
  window.__VC_API_TIMING_SEQ__ = (window.__VC_API_TIMING_SEQ__ ?? 0) + 1;
  window.__VC_API_TIMINGS__.push({
    id: window.__VC_API_TIMING_SEQ__,
    method,
    url,
    pathname,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    status: response?.status ?? null,
    ok: response?.ok ?? false,
  });
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!shouldRecordApiTimings()) {
    return init === undefined ? fetch(input) : fetch(input, init);
  }

  const startedAt = performance.now();
  let response: Response | null = null;
  try {
    response = init === undefined ? await fetch(input) : await fetch(input, init);
    return response;
  } finally {
    recordApiTiming(input, init, startedAt, response);
  }
}

export async function parseJsonOrThrow<T>(
  res: Response,
  fallbackMessage: string
): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = fallbackMessage;
  try {
    const body = await res.json();
    if (body?.detail && typeof body.detail === "string") {
      message = body.detail;
    }
  } catch {
    // Keep fallback message.
  }

  throw new Error(message);
}

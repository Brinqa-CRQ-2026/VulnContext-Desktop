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

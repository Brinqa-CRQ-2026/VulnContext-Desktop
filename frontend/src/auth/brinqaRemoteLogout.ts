const DEFAULT_TIMEOUT_MS = 5000;

export type BrinqaRemoteLogoutRequest = {
  baseUrl: string;
  bearerToken: string;
  sessionCookie: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function buildHeaders(
  bearerToken: string,
  sessionCookie: string,
  baseUrl: string
): HeadersInit {
  return {
    accept: "application/json, text/plain, */*",
    authorization: `Bearer ${bearerToken}`,
    "content-type": "application/json;charset=UTF-8",
    Cookie: `JSESSIONID=${sessionCookie}`,
    origin: baseUrl,
    referer: `${baseUrl}/caasm`,
    "user-agent": "Mozilla/5.0",
    "x-requested-with": "XMLHttpRequest",
  };
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function performBrinqaRemoteLogout({
  baseUrl,
  bearerToken,
  sessionCookie,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: BrinqaRemoteLogoutRequest) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const headers = buildHeaders(bearerToken, sessionCookie, normalizedBaseUrl);

  await fetchWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/api/auth/resetSession`,
    {
      method: "GET",
      headers,
    },
    timeoutMs
  );

  await fetchWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/api/auth/logout`,
    {
      method: "POST",
      headers,
      body: "{}",
    },
    timeoutMs
  );
}

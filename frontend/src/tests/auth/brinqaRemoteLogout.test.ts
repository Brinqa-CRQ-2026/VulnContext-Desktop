import { describe, expect, it, vi } from "vitest";

import { performBrinqaRemoteLogout } from "../../auth/brinqaRemoteLogout";

describe("performBrinqaRemoteLogout", () => {
  it("calls resetSession before logout with bearer token and JSESSIONID", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }))
      .mockResolvedValue(new Response(null, { status: 200 }));

    await performBrinqaRemoteLogout({
      baseUrl: "https://ucsc.brinqa.net",
      bearerToken: "token-123",
      sessionCookie: "jsession-123",
      fetchImpl: fetchMock,
      timeoutMs: 100,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://ucsc.brinqa.net/api/auth/resetSession",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer token-123",
          Cookie: "JSESSIONID=jsession-123",
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ucsc.brinqa.net/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        body: "{}",
        headers: expect.objectContaining({
          authorization: "Bearer token-123",
          Cookie: "JSESSIONID=jsession-123",
        }),
      })
    );
  });
});

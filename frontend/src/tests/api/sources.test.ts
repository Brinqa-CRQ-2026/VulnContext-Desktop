import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadSourcesApi() {
  vi.resetModules();
  return import("../../api/sources");
}

describe("api/sources", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  it("calls GET /sources", async () => {
    const { getSourcesSummary } = await loadSourcesApi();
    await getSourcesSummary();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/sources");
  });
});

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

  it("patches encoded source names with the new source body", async () => {
    const { renameSource } = await loadSourcesApi();
    await renameSource("Qualys Prod", "Qualys");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/sources/Qualys%20Prod",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_source: "Qualys" }),
      })
    );
  });

  it("deletes encoded source names", async () => {
    const { deleteSource } = await loadSourcesApi();
    await deleteSource("Qualys Prod");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/sources/Qualys%20Prod",
      { method: "DELETE" }
    );
  });

  it("surfaces backend errors", async () => {
    const { deleteSource } = await loadSourcesApi();
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "missing source" }), { status: 404 })
    );

    await expect(deleteSource("ghost")).rejects.toThrow("missing source");
  });
});

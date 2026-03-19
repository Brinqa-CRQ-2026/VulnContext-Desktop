import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadImportsApi() {
  vi.resetModules();
  return import("../../api/imports");
}

describe("api/imports", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ inserted: 1 })));
  });

  it("posts FormData with source and file", async () => {
    const { seedQualysCsv } = await loadImportsApi();
    const file = new File(["id,name"], "findings.csv", { type: "text/csv" });

    await seedQualysCsv(file, "Qualys");

    expect(getFetchMock()).toHaveBeenCalledTimes(1);
    const [, init] = getFetchMock().mock.calls[0];
    expect(getFetchMock().mock.calls[0][0]).toBe("https://api.example.com/imports/findings/csv");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);

    const formData = init?.body as FormData;
    expect(formData.get("source")).toBe("Qualys");
    expect(formData.get("file")).toBe(file);
  });

  it("surfaces backend errors", async () => {
    const { seedQualysCsv } = await loadImportsApi();
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "bad csv" }), { status: 400 })
    );

    await expect(
      seedQualysCsv(new File(["x"], "bad.csv", { type: "text/csv" }), "Qualys")
    ).rejects.toThrow("bad csv");
  });
});

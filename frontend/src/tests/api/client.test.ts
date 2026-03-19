import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadClientModule() {
  vi.resetModules();
  return import("../../api/client");
}

describe("api/client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses VITE_API_BASE_URL when configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com ");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });

    const { buildApiUrl } = await loadClientModule();

    expect(buildApiUrl("/findings")).toBe("https://api.example.com/findings");
  });

  it("falls back to the browser host on port 8000", async () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });

    const { buildApiUrl } = await loadClientModule();

    expect(buildApiUrl("/findings/top")).toBe("https://frontend.example.test:8000/findings/top");
  });

  it("falls back to 127.0.0.1 outside http browser context", async () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "file:",
        hostname: "",
      },
    });

    const { buildApiUrl } = await loadClientModule();

    expect(buildApiUrl("/findings")).toBe("http://127.0.0.1:8000/findings");

    vi.unstubAllGlobals();
  });

  it("prefixes paths and appends query parameters", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });

    const { buildApiUrl } = await loadClientModule();
    const params = new URLSearchParams({
      page: "2",
      source: "Qualys",
    });

    expect(buildApiUrl("findings", params)).toBe(
      "https://api.example.com/findings?page=2&source=Qualys"
    );
  });

  it("returns parsed JSON for ok responses", async () => {
    const { parseJsonOrThrow } = await loadClientModule();

    const result = await parseJsonOrThrow<{ ok: boolean }>(
      new Response(JSON.stringify({ ok: true })),
      "fallback"
    );

    expect(result).toEqual({ ok: true });
  });

  it("throws backend detail messages when present", async () => {
    const { parseJsonOrThrow } = await loadClientModule();

    await expect(
      parseJsonOrThrow(
        new Response(JSON.stringify({ detail: "backend error" }), { status: 400 }),
        "fallback"
      )
    ).rejects.toThrow("backend error");
  });

  it("throws the fallback message when the body is not valid JSON", async () => {
    const { parseJsonOrThrow } = await loadClientModule();

    await expect(
      parseJsonOrThrow(
        new Response("not-json", { status: 500, headers: { "Content-Type": "text/plain" } }),
        "fallback"
      )
    ).rejects.toThrow("fallback");
  });
});

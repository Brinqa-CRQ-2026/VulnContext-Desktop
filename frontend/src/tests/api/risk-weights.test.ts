import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadRiskWeightsApi() {
  vi.resetModules();
  return import("../../api/risk-weights");
}

describe("api/risk-weights", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  it("calls GET /risk-weights", async () => {
    const { getRiskWeights } = await loadRiskWeightsApi();
    await getRiskWeights();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/risk-weights");
  });

  it("puts JSON with all weight fields", async () => {
    const { updateRiskWeights } = await loadRiskWeightsApi();
    const weights = {
      cvss_weight: 0.25,
      epss_weight: 0.2,
      kev_weight: 0.15,
      asset_criticality_weight: 0.25,
      context_weight: 0.15,
    };

    await updateRiskWeights(weights);

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/risk-weights",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      })
    );
  });

  it("surfaces backend errors", async () => {
    const { updateRiskWeights } = await loadRiskWeightsApi();
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "invalid weights" }), { status: 400 })
    );

    await expect(
      updateRiskWeights({
        cvss_weight: 0.2,
        epss_weight: 0.2,
        kev_weight: 0.2,
        asset_criticality_weight: 0.2,
        context_weight: 0.2,
      })
    ).rejects.toThrow("invalid weights");
  });
});

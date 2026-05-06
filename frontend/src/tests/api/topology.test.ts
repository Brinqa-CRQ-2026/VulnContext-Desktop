import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadTopologyApi() {
  vi.resetModules();
  return import("../../api/topology");
}

describe("api/topology", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("builds the business-unit risk overview request", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          business_unit: "Online Store",
          slug: "online-store",
          risk_score: 8.4,
          risk_band: "High",
          risk_trend: [],
          severity_counts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
          finding_risk_distribution: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
            unscored: 0,
          },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getBusinessUnitRiskOverview } = await loadTopologyApi();
    await getBusinessUnitRiskOverview("online-store");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store/risk-overview"
    );
  });

  it("builds the scoped business-unit findings request", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [], total: 0, page: 1, page_size: 5 })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getBusinessUnitFindings } = await loadTopologyApi();
    await getBusinessUnitFindings("online-store", {
      page: 2,
      pageSize: 5,
      sortBy: "risk_score",
      sortOrder: "desc",
      source: "Brinqa",
      riskBand: "High",
      search: "openssl",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store/findings?page=2&page_size=5&sort_by=risk_score&sort_order=desc&source=Brinqa&risk_band=High&search=openssl"
    );
  });
});

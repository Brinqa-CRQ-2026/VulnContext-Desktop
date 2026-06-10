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

  it("builds asset findings analytics requests with optional filters", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ asset: {}, analytics: {} }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAssetFindingsAnalytics } = await loadTopologyApi();
    await getAssetFindingsAnalytics("asset-1", {
      riskBand: "Critical",
      kevOnly: true,
      source: "Qualys",
      search: "openssl",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/assets/asset-1/findings/analytics?risk_band=Critical&kev_only=true&source=Qualys&search=openssl"
    );
  });

  it("builds filtered asset list requests and direct-only flags", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 25 }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAssetsPage } = await loadTopologyApi();
    await getAssetsPage({
      page: 3,
      pageSize: 25,
      businessUnit: "Online Store",
      businessService: "Digital Storefront",
      application: "Identity",
      status: "Active",
      environment: "prod",
      compliance: "PCI",
      search: "web",
      directOnly: true,
      sortBy: "asset_criticality",
      sortOrder: "asc",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/assets?page=3&page_size=25&sort_by=asset_criticality&sort_order=asc&business_unit=Online+Store&business_service=Digital+Storefront&application=Identity&status=Active&environment=prod&compliance=PCI&search=web&direct_only=true"
    );
  });

  it("posts business-service FAIR loss payloads to the scoped endpoint", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "frontend.example.test",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    const { predictBusinessServiceFairLoss } = await loadTopologyApi();
    const payload = { iterations: 1000, controls: {} };
    await predictBusinessServiceFairLoss("online-store", "digital-storefront", payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store/business-services/digital-storefront/fair-loss",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  });
});

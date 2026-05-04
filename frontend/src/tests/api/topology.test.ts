import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadTopologyApi() {
  vi.resetModules();
  return import("../../api/topology");
}

describe("api/topology", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    window.localStorage.clear();
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  it("calls GET /topology/business-units", async () => {
    const { getBusinessUnits } = await loadTopologyApi();
    await getBusinessUnits();

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units"
    );
  });

  it("calls GET /topology/business-units/{business_unit_slug}", async () => {
    const { getBusinessUnitDetail } = await loadTopologyApi();
    await getBusinessUnitDetail("online-store");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store"
    );
  });

  it("calls GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}", async () => {
    const { getBusinessServiceDetail, getBusinessServiceAnalytics } = await loadTopologyApi();
    getFetchMock()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await getBusinessServiceDetail("online-store", "digital-storefront");
    await getBusinessServiceAnalytics("online-store", "digital-storefront");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store/business-services/digital-storefront"
    );
    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/topology/business-units/online-store/business-services/digital-storefront/analytics"
    );
  });

  it("calls GET application detail, asset detail, enrichment, and asset findings endpoints", async () => {
    window.localStorage.setItem("brinqaAuthToken", "token-123");
    const {
      getApplicationDetail,
      getAssetDetail,
      getAssetEnrichment,
      getAssetFindings,
      getAssetFindingsAnalytics,
      getAssetsAnalytics,
      getAssetFindingsPage,
      getAssetsPage,
    } = await loadTopologyApi();
    getFetchMock()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));

    await getApplicationDetail(
      "online-store",
      "digital-storefront",
      "identity-verify"
    );
    await getAssetDetail("asset-10");
    await getAssetEnrichment("asset-10");
    await getAssetFindings("asset-10");
    await getAssetFindingsAnalytics("asset-10", {
      riskBand: "High",
      kevOnly: true,
      source: "Brinqa",
      search: "openssl",
    });
    await getAssetFindingsPage("asset-10", {
      page: 2,
      pageSize: 10,
      sortBy: "age_in_days",
      sortOrder: "asc",
      riskBand: "High",
      kevOnly: true,
    });
    await getAssetsPage({
      page: 1,
      pageSize: 10,
      businessUnit: "Online Store",
      businessService: "Digital Media",
      search: "asset-20",
      directOnly: true,
      sortBy: "finding_count",
      sortOrder: "desc",
    });
    await getAssetsAnalytics({
      businessUnit: "Online Store",
      businessService: "Digital Media",
      application: "Inventory Manager",
      status: "Confirmed active",
      environment: "Production",
      compliance: "PCI",
      search: "asset-20",
      directOnly: true,
    });

    expect(getFetchMock()).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/topology/business-units/online-store/business-services/digital-storefront/applications/identity-verify"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/assets/asset-10"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      3,
      "https://api.example.com/assets/asset-10/enrichment",
      { headers: { "X-Brinqa-Auth-Token": "token-123" } }
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      4,
      "https://api.example.com/assets/asset-10/findings"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      5,
      "https://api.example.com/assets/asset-10/findings/analytics?risk_band=High&kev_only=true&source=Brinqa&search=openssl"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      6,
      "https://api.example.com/assets/asset-10/findings?page=2&page_size=10&sort_by=age_in_days&sort_order=asc&risk_band=High&kev_only=true"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      7,
      "https://api.example.com/assets?page=1&page_size=10&sort_by=finding_count&sort_order=desc&business_unit=Online+Store&business_service=Digital+Media&search=asset-20&direct_only=true"
    );
    expect(getFetchMock()).toHaveBeenNthCalledWith(
      8,
      "https://api.example.com/assets/analytics?business_unit=Online+Store&business_service=Digital+Media&application=Inventory+Manager&status=Confirmed+active&environment=Production&compliance=PCI&search=asset-20&direct_only=true"
    );
  });

  it("does not attach Brinqa auth headers to the DB-only asset detail route", async () => {
    window.localStorage.setItem("brinqaAuthToken", "token-123");
    const { getAssetDetail } = await loadTopologyApi();

    await getAssetDetail("asset-10");

    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/assets/asset-10");
  });
});

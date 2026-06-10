import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServiceDetailPage } from "../../../pages/topology/BusinessServiceDetailPage";
import { useAssetsAnalytics } from "../../../hooks/topology/assets/useAssetsAnalytics";
import { useBusinessServiceAnalytics } from "../../../hooks/topology/business-services/useBusinessServiceAnalytics";
import { useBusinessServiceDetail } from "../../../hooks/topology/business-services/useBusinessServiceDetail";
import { usePaginatedAssets } from "../../../hooks/topology/assets/usePaginatedAssets";

vi.mock("../../../hooks/topology/business-services/useBusinessServiceDetail", () => ({
  useBusinessServiceDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/business-services/useBusinessServiceAnalytics", () => ({
  useBusinessServiceAnalytics: vi.fn(),
}));
vi.mock("../../../hooks/topology/assets/usePaginatedAssets", () => ({
  usePaginatedAssets: vi.fn(),
}));
vi.mock("../../../hooks/topology/assets/useAssetsAnalytics", () => ({
  useAssetsAnalytics: vi.fn(),
}));

const mockedUseBusinessServiceDetail = vi.mocked(useBusinessServiceDetail);
const mockedUseBusinessServiceAnalytics = vi.mocked(useBusinessServiceAnalytics);
const mockedUsePaginatedAssets = vi.mocked(usePaginatedAssets);
const mockedUseAssetsAnalytics = vi.mocked(useAssetsAnalytics);

describe("BusinessServiceDetailPage", () => {
  it("renders loading, unavailable, generic error, empty applications, and analytics warnings", () => {
    mockedUseBusinessServiceAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: null,
    });
    mockedUsePaginatedAssets.mockReturnValue({
      data: { items: [], total: 0, page: 1, page_size: 10 },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 10,
    });
    mockedUseAssetsAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: null,
    });
    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: null,
      loading: true,
      error: null,
    });

    const props = {
      businessUnitSlug: "online-store",
      businessServiceSlug: "digital-storefront",
      refreshToken: 0,
      onBack: vi.fn(),
      onOpenOverview: vi.fn(),
      onOpenBusinessUnit: vi.fn(),
      onOpenApplication: vi.fn(),
      onOpenAssetFindings: vi.fn(),
    };

    const { rerender } = render(<BusinessServiceDetailPage {...props} />);
    expect(screen.getByText("Loading business service")).toBeInTheDocument();

    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: null,
      loading: false,
      error: "Normalized topology tables are not initialized.",
    });
    rerender(<BusinessServiceDetailPage {...props} />);
    expect(screen.getByText("Topology schema not initialized")).toBeInTheDocument();

    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: null,
      loading: false,
      error: "Request failed",
    });
    rerender(<BusinessServiceDetailPage {...props} />);
    expect(screen.getByText("Business service not found")).toBeInTheDocument();

    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        slug: "digital-storefront",
        description: null,
        metrics: {
          total_business_services: 0,
          total_applications: 0,
          total_assets: 0,
          total_findings: 0,
        },
        applications: [],
        direct_assets: [],
      },
      loading: false,
      error: null,
    });
    mockedUseBusinessServiceAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: "Analytics unavailable",
    });
    rerender(<BusinessServiceDetailPage {...props} />);
    expect(screen.getByText("No applications")).toBeInTheDocument();
    expect(screen.getAllByText("Analytics unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("No assets")).toBeInTheDocument();
  });

  it("renders application cards and direct assets in the explorer table", () => {
    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        slug: "digital-storefront",
        description: null,
        risk_score: 8.4,
        risk_band: "High",
        priority_score: 8.1,
        business_criticality_score: 3,
        metrics: {
          total_business_services: 0,
          total_applications: 2,
          total_assets: 37,
          total_findings: 1132,
        },
        applications: [
          {
            application: "Identity Verify",
            slug: "identity-verify",
            metrics: {
              total_business_services: 0,
              total_applications: 0,
              total_assets: 1,
              total_findings: 2,
            },
          },
          {
            application: "Cart Service",
            slug: "cart-service",
            metrics: {
              total_business_services: 0,
              total_applications: 0,
              total_assets: 4,
              total_findings: 8,
            },
          },
        ],
        direct_assets: [
          {
            asset_id: "asset-22",
            hostname: "host-22.internal",
            device_type: "Firewall",
            environment: "production",
            category: "Host",
            pci: true,
            aggregated_finding_risk: 7.4,
            asset_context_score: 9,
            asset_risk_score: 8.9,
            status: "Active",
            compliance_status: "Compliant",
            finding_count: 3,
          },
          {
            asset_id: "asset-09",
            hostname: "alpha.internal",
            finding_count: 9,
          },
        ],
      },
      loading: false,
      error: null,
    });
    mockedUsePaginatedAssets.mockReturnValue({
      data: {
        items: [
          {
            asset_id: "asset-22",
            hostname: "host-22.internal",
            device_type: "Firewall",
            environment: "production",
            category: "Host",
            pci: true,
            aggregated_finding_risk: 7.4,
            asset_context_score: 9,
            asset_risk_score: 8.9,
            status: "Active",
            finding_count: 3,
          },
          {
            asset_id: "asset-09",
            hostname: "alpha.internal",
            device_type: "Server",
            category: "Endpoint",
            environment: "development",
            pii: true,
            asset_risk_score: 3.2,
            status: "Closed",
            finding_count: 9,
          },
          {
            asset_id: "asset-88",
            hostname: "zeta.internal",
            device_type: "Workstation",
            category: "Endpoint",
            environment: "production",
            asset_risk_score: 5.4,
            status: "Active",
            finding_count: 1,
          },
          {
            asset_id: "asset-99",
            hostname: "omega.internal",
            device_type: "Load Balancer",
            category: "Network",
            environment: "production",
            asset_risk_score: 9.3,
            status: "Active",
            finding_count: 1,
          },
          {
            asset_id: "asset-77",
            hostname: "delta.internal",
            device_type: "Proxy",
            category: "Network",
            environment: "staging",
            asset_risk_score: 6.7,
            status: "Active",
            finding_count: 2,
          },
          {
            asset_id: "asset-66",
            hostname: "theta.internal",
            device_type: "Router",
            category: "Network",
            environment: "production",
            asset_risk_score: 7.1,
            status: "Active",
            finding_count: 2,
          },
        ],
        total: 6,
        page: 1,
        page_size: 10,
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 10,
    });
    mockedUseBusinessServiceAnalytics.mockReturnValue({
      analytics: {
        service_risk_score: null,
        service_risk_label: null,
        business_criticality_score: 4,
        business_criticality_max: 5,
        business_criticality_label: "High",
        totals: {
          applications: 3,
          assets: 146,
          findings: 5162,
        },
        asset_criticality_distribution: {
          low: 0,
          medium: 3,
          high: 1,
          critical: 1,
          unscored: 0,
        },
        asset_type_distribution: [
          { label: "Server", count: 60 },
          { label: "Firewall", count: 42 },
          { label: "Workstation", count: 18 },
          { label: "Load Balancer", count: 16 },
          { label: "Proxy", count: 10 },
        ],
      },
      loading: false,
      error: null,
    });
    mockedUseAssetsAnalytics.mockReturnValue({
      analytics: {
        total_assets: 2,
        asset_criticality_distribution: {
          low: 0,
          medium: 0,
          high: 1,
          critical: 1,
          unscored: 0,
        },
        finding_risk_distribution: {
          low: 0,
          medium: 0,
          high: 1,
          critical: 1,
          unscored: 0,
        },
      },
      loading: false,
      error: null,
    });

    const onOpenApplication = vi.fn();
    const onOpenAssetFindings = vi.fn();
    render(
      <BusinessServiceDetailPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenApplication={onOpenApplication}
        onOpenAssetFindings={onOpenAssetFindings}
      />
    );

    expect(screen.queryByText("Business Service Detail")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Applications and direct assets under the selected business service.")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Service Risk Score")).toBeInTheDocument();
    expect(screen.getByText("Business Criticality")).toBeInTheDocument();
    expect(screen.getByText("8.4")).toBeInTheDocument();
    const businessCriticalityCard = screen
      .getByText("Business Criticality")
      .closest(".rounded-xl");
    expect(businessCriticalityCard).not.toBeNull();
    expect(within(businessCriticalityCard as HTMLElement).getByText("3.0")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Description for this business service will appear here when it is available."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Service Totals")).not.toBeInTheDocument();
    expect(screen.getByText("Total Applications")).toBeInTheDocument();
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getAllByText("Total Findings").length).toBeGreaterThan(0);
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText("1,132")).toBeInTheDocument();
    expect(screen.queryByText("Asset Criticality Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText("All assets under Digital Storefront")).not.toBeInTheDocument();
    expect(screen.getByText("Asset Type Distribution")).toBeInTheDocument();
    expect(screen.getByText("Top 5 asset types under Digital Storefront")).toBeInTheDocument();
    expect(screen.queryByText("Finding Risk Spread")).not.toBeInTheDocument();
    expect(screen.getByText("Business Service FAIR Loss Exposure")).toBeInTheDocument();
    expect(screen.queryByText("Chart / Visual / Info")).not.toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("Direct Assets")).toBeInTheDocument();
    expect(
      screen.getByText("Assets directly associated with this business service.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Back$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Application/i })).not.toBeInTheDocument();
    expect(screen.getByText("Asset criticality spread")).toBeInTheDocument();
    expect(screen.getByText("Aggregated Finding Risk Spread")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Status$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Compliance$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset type$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Environment$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Category$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset Criticality$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset Risk Score$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Total Findings$/i })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Aggregated Finding Risk$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Finding risk$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Criticality$/i })).not.toBeInTheDocument();
    expect(screen.getByText("identity-verify")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Asset ID$/i })).not.toBeInTheDocument();
    const [assetsTable] = screen.getAllByRole("table");
    expect(within(assetsTable).getByText("Firewall")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Server")).toBeInTheDocument();
    expect(within(assetsTable).getAllByText("Endpoint").length).toBeGreaterThan(0);
    expect(within(assetsTable).getAllByText("Production").length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText("Development")).toBeInTheDocument();
    expect(within(assetsTable).getByText("8.9")).toBeInTheDocument();
    expect(within(assetsTable).getAllByText("High").length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText("3.2")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Low")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PCI")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PII")).toBeInTheDocument();
    expect(within(assetsTable).getAllByText("Active").length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText("Not active")).toBeInTheDocument();
    expect(mockedUseBusinessServiceAnalytics).toHaveBeenCalledWith(
      "online-store",
      "digital-storefront",
      0
    );
    fireEvent.click(screen.getByRole("button", { name: /Open Cart Service/i }));
    fireEvent.click(screen.getByRole("button", { name: /Open alpha\.internal/i }));

    expect(onOpenApplication).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "cart-service" })
    );
    expect(onOpenAssetFindings).toHaveBeenCalledWith(
      expect.objectContaining({ asset_id: "asset-09" })
    );
  });

  it("renders application cards and preserves API order for direct assets", () => {
    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        slug: "digital-storefront",
        description: "Customer-facing storefront for digital checkout and browsing.",
        metrics: {
          total_business_services: 0,
          total_applications: 2,
          total_assets: 2,
          total_findings: 12,
        },
        applications: [
          {
            application: "Zulu App",
            slug: "zulu-app",
            metrics: {
              total_business_services: 0,
              total_applications: 0,
              total_assets: 1,
              total_findings: 1,
            },
          },
          {
            application: "Alpha App",
            slug: "alpha-app",
            metrics: {
              total_business_services: 0,
              total_applications: 0,
              total_assets: 1,
              total_findings: 10,
            },
          },
        ],
        direct_assets: [
          { asset_id: "z-asset", hostname: "z-host", category: "Endpoint", environment: "test", finding_count: 1 },
          { asset_id: "a-asset", hostname: "a-host", device_type: "Server", environment: "production", finding_count: 9 },
        ],
      },
      loading: false,
      error: null,
    });
    mockedUsePaginatedAssets.mockReturnValue({
      data: {
        items: [
          { asset_id: "z-asset", hostname: "z-host", category: "Endpoint", environment: "test", finding_count: 1 },
          { asset_id: "a-asset", hostname: "a-host", device_type: "Server", environment: "production", finding_count: 9 },
        ],
        total: 2,
        page: 1,
        page_size: 10,
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 10,
    });
    mockedUseBusinessServiceAnalytics.mockReturnValue({
      analytics: {
        service_risk_score: null,
        service_risk_label: null,
        business_criticality_score: 4,
        business_criticality_max: 5,
        business_criticality_label: "High",
        totals: {
          applications: 2,
          assets: 2,
          findings: 12,
        },
        asset_criticality_distribution: {
          low: 1,
          medium: 0,
          high: 0,
          critical: 0,
          unscored: 1,
        },
        asset_type_distribution: [
          { label: "Server", count: 1 },
          { label: "Endpoint", count: 1 },
        ],
      },
      loading: false,
      error: null,
    });
    mockedUseAssetsAnalytics.mockReturnValue({
      analytics: {
        total_assets: 2,
        asset_criticality_distribution: {
          low: 1,
          medium: 0,
          high: 0,
          critical: 0,
          unscored: 1,
        },
        finding_risk_distribution: {
          low: 0,
          medium: 1,
          high: 0,
          critical: 0,
          unscored: 1,
        },
      },
      loading: false,
      error: null,
    });

    render(
      <BusinessServiceDetailPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenApplication={vi.fn()}
        onOpenAssetFindings={vi.fn()}
      />
    );

    expect(
      screen.getByText("Customer-facing storefront for digital checkout and browsing.")
    ).toBeInTheDocument();
    const [assetsTable] = screen.getAllByRole("table");
    const applicationButtons = screen.getAllByRole("button", {
      name: /^Open .* App$/i,
    });
    let assetRows = within(assetsTable).getAllByRole("button", { name: /^Open /i });

    expect(applicationButtons[0]).toHaveAccessibleName("Open Zulu App");
    expect(applicationButtons[1]).toHaveAccessibleName("Open Alpha App");
    expect(assetRows[0]).toHaveAccessibleName("Open z-host");

    expect(screen.getByPlaceholderText("Search asset or ID")).toBeInTheDocument();
    assetRows = within(assetsTable).getAllByRole("button", { name: /^Open /i });
    expect(assetRows[0]).toHaveAccessibleName("Open z-host");
    expect(assetRows[1]).toHaveAccessibleName("Open a-host");
  });
});

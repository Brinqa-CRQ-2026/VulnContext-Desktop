import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServiceDetailPage } from "../../../components/business-services/BusinessServiceDetailPage";
import { useAssetsAnalytics } from "../../../hooks/topology/useAssetsAnalytics";
import { useBusinessServiceAnalytics } from "../../../hooks/topology/useBusinessServiceAnalytics";
import { useBusinessServiceDetail } from "../../../hooks/topology/useBusinessServiceDetail";
import { usePaginatedAssets } from "../../../hooks/topology/usePaginatedAssets";

vi.mock("../../../hooks/topology/useBusinessServiceDetail", () => ({
  useBusinessServiceDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/useBusinessServiceAnalytics", () => ({
  useBusinessServiceAnalytics: vi.fn(),
}));
vi.mock("../../../hooks/topology/usePaginatedAssets", () => ({
  usePaginatedAssets: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetsAnalytics", () => ({
  useAssetsAnalytics: vi.fn(),
}));

const mockedUseBusinessServiceDetail = vi.mocked(useBusinessServiceDetail);
const mockedUseBusinessServiceAnalytics = vi.mocked(useBusinessServiceAnalytics);
const mockedUsePaginatedAssets = vi.mocked(usePaginatedAssets);
const mockedUseAssetsAnalytics = vi.mocked(useAssetsAnalytics);

describe("BusinessServiceDetailPage", () => {
  it("renders applications and direct assets in sortable tables", () => {
    mockedUseBusinessServiceDetail.mockReturnValue({
      businessService: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        slug: "digital-storefront",
        description: null,
        metrics: {
          total_business_services: 0,
          total_applications: 2,
          total_assets: 3,
          total_findings: 9,
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
            status: "Closed",
            finding_count: 9,
          },
          {
            asset_id: "asset-88",
            hostname: "zeta.internal",
            device_type: "Workstation",
            category: "Endpoint",
            environment: "production",
            status: "Active",
            finding_count: 1,
          },
          {
            asset_id: "asset-99",
            hostname: "omega.internal",
            device_type: "Load Balancer",
            category: "Network",
            environment: "production",
            status: "Active",
            finding_count: 1,
          },
          {
            asset_id: "asset-77",
            hostname: "delta.internal",
            device_type: "Proxy",
            category: "Network",
            environment: "staging",
            status: "Active",
            finding_count: 2,
          },
          {
            asset_id: "asset-66",
            hostname: "theta.internal",
            device_type: "Router",
            category: "Network",
            environment: "production",
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
    expect(screen.getByText("9.2")).toBeInTheDocument();
    const businessCriticalityCard = screen
      .getByText("Business Criticality")
      .closest(".rounded-xl");
    expect(businessCriticalityCard).not.toBeNull();
    expect(within(businessCriticalityCard as HTMLElement).getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Description for this business service will appear here when it is available."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Service Totals")).not.toBeInTheDocument();
    expect(screen.getByText("Total Applications")).toBeInTheDocument();
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("Total Findings")).toBeInTheDocument();
    expect(screen.getByText("146")).toBeInTheDocument();
    expect(screen.getByText("5,162")).toBeInTheDocument();
    expect(screen.getByText("Asset Criticality Distribution")).toBeInTheDocument();
    expect(screen.getByText("All assets under Digital Storefront")).toBeInTheDocument();
    expect(screen.getByText("Asset Type Distribution")).toBeInTheDocument();
    expect(screen.getByText("Top 5 asset types under Digital Storefront")).toBeInTheDocument();
    expect(screen.getByText("Load Balancer")).toBeInTheDocument();
    expect(screen.getByText("Proxy")).toBeInTheDocument();
    expect(screen.queryByText("Chart / Visual / Info")).not.toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("Direct Assets")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Application/i })).toBeInTheDocument();
    expect(screen.getByText("Asset criticality spread")).toBeInTheDocument();
    expect(screen.getByText("Finding risk spread")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Status$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Asset type$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Environment$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Compliance$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Category$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Finding risk$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Criticality$/i })).toBeInTheDocument();
    expect(screen.getByText("identity-verify")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Asset ID$/i })).not.toBeInTheDocument();
    const [, assetsTable] = screen.getAllByRole("table");
    expect(within(assetsTable).getByText("Firewall")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Server")).toBeInTheDocument();
    expect(within(assetsTable).getAllByText("Endpoint").length).toBeGreaterThan(0);
    expect(within(assetsTable).getAllByText("Production").length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText("Development")).toBeInTheDocument();
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

  it("re-sorts applications and preserves API order for direct assets", () => {
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
    const [applicationsTable, assetsTable] = screen.getAllByRole("table");
    let applicationRows = within(applicationsTable).getAllByRole("button", {
      name: /^Open /i,
    });
    let assetRows = within(assetsTable).getAllByRole("button", { name: /^Open /i });

    expect(applicationRows[0]).toHaveAccessibleName("Open Alpha App");
    expect(assetRows[0]).toHaveAccessibleName("Open z-host");

    fireEvent.click(screen.getAllByRole("button", { name: /^Application$/i })[0]);
    applicationRows = within(applicationsTable).getAllByRole("button", {
      name: /^Open /i,
    });
    expect(applicationRows[0]).toHaveAccessibleName("Open Alpha App");
    expect(applicationRows[1]).toHaveAccessibleName("Open Zulu App");

    expect(screen.getByPlaceholderText("Search asset or ID")).toBeInTheDocument();
    assetRows = within(assetsTable).getAllByRole("button", { name: /^Open /i });
    expect(assetRows[0]).toHaveAccessibleName("Open z-host");
    expect(assetRows[1]).toHaveAccessibleName("Open a-host");
  });
});

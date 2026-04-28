import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServiceDetailPage } from "../../../components/business-services/BusinessServiceDetailPage";
import { useAssetsAnalytics } from "../../../hooks/topology/useAssetsAnalytics";
import { useBusinessServiceDetail } from "../../../hooks/topology/useBusinessServiceDetail";
import { usePaginatedAssets } from "../../../hooks/topology/usePaginatedAssets";

vi.mock("../../../hooks/topology/useBusinessServiceDetail", () => ({
  useBusinessServiceDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/usePaginatedAssets", () => ({
  usePaginatedAssets: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetsAnalytics", () => ({
  useAssetsAnalytics: vi.fn(),
}));

const mockedUseBusinessServiceDetail = vi.mocked(useBusinessServiceDetail);
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
    expect(within(assetsTable).getByText("Endpoint")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Production")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Development")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PCI")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PII")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Active")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Not active")).toBeInTheDocument();

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

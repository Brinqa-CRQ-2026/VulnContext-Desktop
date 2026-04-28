import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApplicationDetailPage } from "../../../components/business-services/ApplicationDetailPage";
import { useApplicationDetail } from "../../../hooks/topology/useApplicationDetail";
import { useAssetsAnalytics } from "../../../hooks/topology/useAssetsAnalytics";
import { usePaginatedAssets } from "../../../hooks/topology/usePaginatedAssets";

vi.mock("../../../hooks/topology/useApplicationDetail", () => ({
  useApplicationDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/usePaginatedAssets", () => ({
  usePaginatedAssets: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetsAnalytics", () => ({
  useAssetsAnalytics: vi.fn(),
}));

const mockedUseApplicationDetail = vi.mocked(useApplicationDetail);
const mockedUsePaginatedAssets = vi.mocked(usePaginatedAssets);
const mockedUseAssetsAnalytics = vi.mocked(useAssetsAnalytics);

describe("ApplicationDetailPage", () => {
  it("renders assets in a sortable table and exposes asset-findings entry points", () => {
    mockedUseApplicationDetail.mockReturnValue({
      application: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        application: "Identity Verify",
        slug: "identity-verify",
        metrics: {
          total_business_services: 0,
          total_applications: 0,
          total_assets: 2,
          total_findings: 5,
        },
        assets: [
          {
            asset_id: "asset-10",
            hostname: "id-verify-01",
            device_type: "Server",
            environment: "production",
            category: "Host",
            pci: true,
            pii: true,
            compliance_flags: "sox",
            aggregated_finding_risk: 8.5,
            asset_context_score: 9,
            status: "Active",
            compliance_status: "Compliant",
            finding_count: 2,
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
            asset_id: "asset-10",
            hostname: "id-verify-01",
            device_type: "Server",
            environment: "production",
            category: "Host",
            pci: true,
            pii: true,
            compliance_flags: "sox",
            aggregated_finding_risk: 8.5,
            asset_context_score: 9,
            status: "Active",
            compliance_status: "Compliant",
            finding_count: 2,
          },
        ],
        total: 1,
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
        total_assets: 1,
        asset_criticality_distribution: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 1,
          unscored: 0,
        },
        finding_risk_distribution: {
          low: 0,
          medium: 0,
          high: 1,
          critical: 0,
          unscored: 0,
        },
      },
      loading: false,
      error: null,
    });

    const onOpenAssetFindings = vi.fn();
    render(
      <ApplicationDetailPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        applicationSlug="identity-verify"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenAssetFindings={onOpenAssetFindings}
      />
    );

    expect(screen.getByText("Business Units")).toBeInTheDocument();
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
    expect(screen.queryByRole("columnheader", { name: /^Asset ID$/i })).not.toBeInTheDocument();
    const [assetsTable] = screen.getAllByRole("table");
    expect(within(assetsTable).getByText("Server")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Production")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Host")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PCI")).toBeInTheDocument();
    expect(within(assetsTable).getByText("PII")).toBeInTheDocument();
    expect(within(assetsTable).getByText("SOX")).toBeInTheDocument();
    expect(within(assetsTable).getByText("8.5")).toBeInTheDocument();
    expect(within(assetsTable).getByText("9.0")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Active")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Active")).toHaveClass("border-emerald-200");
    expect(
      within(assetsTable)
        .getByRole("columnheader", { name: /^Status$/i })
        .querySelector("svg")
    ).toBeNull();

    fireEvent.click(within(assetsTable).getByRole("button", { name: /Open id-verify-01/i }));
    expect(onOpenAssetFindings).toHaveBeenCalledWith(
      expect.objectContaining({ asset_id: "asset-10" })
    );
  });

  it("renders inventory controls for the paginated asset list", () => {
    mockedUseApplicationDetail.mockReturnValue({
      application: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        application: "Identity Verify",
        slug: "identity-verify",
        metrics: {
          total_business_services: 0,
          total_applications: 0,
          total_assets: 2,
          total_findings: 5,
        },
        assets: [],
      },
      loading: false,
      error: null,
    });
    mockedUsePaginatedAssets.mockReturnValue({
      data: {
        items: [
          {
            asset_id: "asset-10",
            hostname: "z-host",
            device_type: "Workstation",
            category: "Endpoint",
            environment: "test",
            pci: true,
            aggregated_finding_risk: 4.2,
            asset_context_score: 6.5,
            status: "Retired",
            finding_count: 2,
          },
          {
            asset_id: "asset-11",
            hostname: "a-host",
            device_type: "Server",
            category: "Host",
            compliance_flags: "hipaa",
            aggregated_finding_risk: 7,
            asset_context_score: 8.1,
            finding_count: 7,
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
          medium: 1,
          high: 1,
          critical: 0,
          unscored: 0,
        },
        finding_risk_distribution: {
          low: 0,
          medium: 1,
          high: 1,
          critical: 0,
          unscored: 0,
        },
      },
      loading: false,
      error: null,
    });

    render(
      <ApplicationDetailPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        applicationSlug="identity-verify"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenAssetFindings={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Search asset or ID")).toBeInTheDocument();
    expect(screen.getByText("Sort by")).toBeInTheDocument();
    expect(screen.getAllByText("Environment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Compliance").length).toBeGreaterThan(0);
    const [assetsTable] = screen.getAllByRole("table");
    expect(within(assetsTable).getByText("Endpoint")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Workstation")).toBeInTheDocument();
    expect(within(assetsTable).getByText("Test")).toBeInTheDocument();
    expect(within(assetsTable).getByText("HIPAA")).toBeInTheDocument();
    expect(within(assetsTable).getAllByText("Not active")).toHaveLength(2);
    const rows = within(assetsTable).getAllByRole("button", { name: /^Open /i });
    expect(rows[0]).toHaveAccessibleName("Open z-host");
  });
});

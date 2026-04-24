import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApplicationDetailPage } from "../../../components/business-services/ApplicationDetailPage";
import { useApplicationDetail } from "../../../hooks/topology/useApplicationDetail";
import { usePaginatedAssets } from "../../../hooks/topology/usePaginatedAssets";

vi.mock("../../../hooks/topology/useApplicationDetail", () => ({
  useApplicationDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/usePaginatedAssets", () => ({
  usePaginatedAssets: vi.fn(),
}));

const mockedUseApplicationDetail = vi.mocked(useApplicationDetail);
const mockedUsePaginatedAssets = vi.mocked(usePaginatedAssets);

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
            exposure_score: 8.5,
            business_criticality_score: 9,
            data_sensitivity_score: 4,
            asset_type_weight: 1.1,
            is_public_facing: true,
            has_sensitive_data: true,
            crown_jewel_flag: false,
            internet_exposed_flag: true,
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
    expect(screen.getByRole("columnheader", { name: /^Asset$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Status$/i })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Exposure/i })).not.toBeInTheDocument();
    const [assetsTable] = screen.getAllByRole("table");
    expect(within(assetsTable).getByText("Active")).toBeInTheDocument();

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
          { asset_id: "asset-10", hostname: "z-host", finding_count: 2 },
          { asset_id: "asset-11", hostname: "a-host", finding_count: 7 },
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
    const [assetsTable] = screen.getAllByRole("table");
    const rows = within(assetsTable).getAllByRole("button", { name: /^Open /i });
    expect(rows[0]).toHaveAccessibleName("Open z-host");
  });
});

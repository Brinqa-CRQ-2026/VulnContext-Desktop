import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessUnitDetailPage } from "../../../pages/topology/BusinessUnitDetailPage";
import { useBusinessUnitDetail } from "../../../hooks/topology/business-units/useBusinessUnitDetail";
import { useBusinessUnitRiskOverview } from "../../../hooks/topology/business-units/useBusinessUnitRiskOverview";
import { useBusinessUnitTopFindings } from "../../../hooks/topology/business-units/useBusinessUnitTopFindings";

vi.mock("../../../hooks/topology/business-units/useBusinessUnitDetail", () => ({
  useBusinessUnitDetail: vi.fn(),
}));

vi.mock("../../../hooks/topology/business-units/useBusinessUnitRiskOverview", () => ({
  useBusinessUnitRiskOverview: vi.fn(),
}));

vi.mock("../../../hooks/topology/business-units/useBusinessUnitTopFindings", () => ({
  useBusinessUnitTopFindings: vi.fn(),
}));

const mockedUseBusinessUnitDetail = vi.mocked(useBusinessUnitDetail);
const mockedUseBusinessUnitRiskOverview = vi.mocked(useBusinessUnitRiskOverview);
const mockedUseBusinessUnitTopFindings = vi.mocked(useBusinessUnitTopFindings);

describe("BusinessUnitDetailPage", () => {
  beforeEach(() => {
    mockedUseBusinessUnitRiskOverview.mockReturnValue({
      riskOverview: {
        business_unit: "Online Store",
        slug: "online-store",
        risk_score: 8.4,
        risk_band: "High",
        risk_trend: [
          { period: "Jan 2024", score: 8.1 },
          { period: "Feb 2024", score: 8.3 },
        ],
        severity_counts: {
          Critical: 1,
          High: 1,
          Medium: 0,
          Low: 1,
        },
        finding_risk_distribution: {
          low: 1,
          medium: 0,
          high: 1,
          critical: 1,
          unscored: 0,
        },
      },
      loading: false,
      error: null,
    });
    mockedUseBusinessUnitTopFindings.mockReturnValue({
      data: {
        items: [
          {
            id: "finding-1",
            source: "Brinqa",
            asset_id: "asset-1",
            cve_id: "CVE-2026-0001",
            target_names: "storefront-app",
            business_service: "Digital Storefront",
            application: "Identity Verify",
            risk_score: 8.6,
            priority_score: 9.1,
            risk_band: "High",
            age_in_days: 42,
            lifecycle_status: "Active",
            isKev: true,
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 20,
    });
  });

  it("renders loading, schema-unavailable, generic error, and empty child-service states", () => {
    mockedUseBusinessUnitDetail.mockReturnValue({
      businessUnit: null,
      loading: true,
      error: null,
    });

    const { rerender } = render(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessService={vi.fn()}
      />
    );

    expect(screen.getByText("Loading business unit")).toBeInTheDocument();

    mockedUseBusinessUnitDetail.mockReturnValue({
      businessUnit: null,
      loading: false,
      error: "Normalized topology tables are not initialized.",
    });
    rerender(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessService={vi.fn()}
      />
    );
    expect(screen.getByText("Topology schema not initialized")).toBeInTheDocument();

    mockedUseBusinessUnitDetail.mockReturnValue({
      businessUnit: null,
      loading: false,
      error: "Request failed",
    });
    rerender(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessService={vi.fn()}
      />
    );
    expect(screen.getByText("Business unit not found")).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();

    mockedUseBusinessUnitDetail.mockReturnValue({
      businessUnit: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        slug: "online-store",
        description: null,
        metrics: {
          total_business_services: 0,
          total_applications: 0,
          total_assets: 0,
          total_findings: 0,
        },
        business_services: [],
      },
      loading: false,
      error: null,
    });
    mockedUseBusinessUnitRiskOverview.mockReturnValue({
      riskOverview: null,
      loading: false,
      error: "Risk analytics failed",
    });
    mockedUseBusinessUnitTopFindings.mockReturnValue({
      data: { items: [], total: 0, page: 1, page_size: 20 },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 20,
    });
    rerender(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessService={vi.fn()}
      />
    );

    expect(screen.getByText("No business services")).toBeInTheDocument();
    expect(screen.getAllByText("Risk analytics failed")).toHaveLength(2);
  });

  it("renders child business services from the live business-unit detail", () => {
    mockedUseBusinessUnitDetail.mockReturnValue({
      businessUnit: {
        company: { name: "Virtucon" },
        business_unit: "Online Store",
        slug: "online-store",
        description: "Online commerce systems.",
        metrics: {
          total_business_services: 2,
          total_applications: 4,
          total_assets: 9,
          total_findings: 18,
        },
        business_services: [
          {
            business_service: "Digital Storefront",
            slug: "digital-storefront",
            metrics: {
              total_business_services: 0,
              total_applications: 3,
              total_assets: 5,
              total_findings: 11,
            },
          },
          {
            business_service: "Shipping and Tracking",
            slug: "shipping-and-tracking",
            metrics: {
              total_business_services: 0,
              total_applications: 1,
              total_assets: 4,
              total_findings: 7,
            },
          },
        ],
      },
      loading: false,
      error: null,
    });

    const onOpenBusinessService = vi.fn();
    const onOpenOverview = vi.fn();
    render(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={onOpenOverview}
        onOpenBusinessService={onOpenBusinessService}
      />
    );

    expect(screen.getByText("Business Units")).toBeInTheDocument();
    expect(screen.getAllByText("Online Store").length).toBeGreaterThan(0);
    expect(screen.getByText("Online commerce systems.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back to Business Units/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Risk Score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8.4").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Risk score 8.4/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Risk over time").length).toBeGreaterThan(0);
    expect(screen.queryByText("Asset Criticality Distribution")).not.toBeInTheDocument();
    expect(screen.getByText("Finding risk spread")).toBeInTheDocument();
    expect(screen.getByText("Findings in this Business Unit")).toBeInTheDocument();
    expect(screen.queryByText("Top Findings in this Business Unit")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View all findings" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Applications").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Findings").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Digital Storefront").length).toBeGreaterThan(0);
    expect(screen.getByText("Shipping and Tracking")).toBeInTheDocument();
    expect(screen.getAllByText("No risk data").length).toBeGreaterThan(0);
    expect(screen.getByText("CVE-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("storefront-app")).toBeInTheDocument();
    expect(screen.getByText("9.1")).toBeInTheDocument();
    expect(screen.getByText("42d")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Risk band: All/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sort by: Priority Score/i })).toBeInTheDocument();
    expect(screen.getByLabelText("KEV")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Business Service" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Asset" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Risk Score" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Priority Score/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "CVSS" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "EPSS" })).not.toBeInTheDocument();
    expect(screen.queryByText("Mock 6-month trend")).not.toBeInTheDocument();
    expect(mockedUseBusinessUnitTopFindings).toHaveBeenCalledWith("online-store", {
      pageSize: 20,
      sortBy: "priority_score",
      sortOrder: "desc",
      riskBand: null,
      search: null,
      refreshToken: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: /Digital Storefront/i }));
    expect(onOpenBusinessService).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "digital-storefront" })
    );
  });
});

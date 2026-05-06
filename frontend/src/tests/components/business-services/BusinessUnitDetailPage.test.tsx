import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessUnitDetailPage } from "../../../components/business-services/BusinessUnitDetailPage";
import { useBusinessUnitDetail } from "../../../hooks/topology/useBusinessUnitDetail";
import { useBusinessUnitRiskOverview } from "../../../hooks/topology/useBusinessUnitRiskOverview";
import { useBusinessUnitTopFindings } from "../../../hooks/topology/useBusinessUnitTopFindings";

vi.mock("../../../hooks/topology/useBusinessUnitDetail", () => ({
  useBusinessUnitDetail: vi.fn(),
}));

vi.mock("../../../hooks/topology/useBusinessUnitRiskOverview", () => ({
  useBusinessUnitRiskOverview: vi.fn(),
}));

vi.mock("../../../hooks/topology/useBusinessUnitTopFindings", () => ({
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
        items: [],
        total: 0,
        page: 1,
        page_size: 5,
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 5,
    });
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
    expect(screen.getAllByText("Risk over time").length).toBeGreaterThan(0);
    expect(screen.queryByText("Asset Criticality Distribution")).not.toBeInTheDocument();
    expect(screen.getByText("Finding risk spread")).toBeInTheDocument();
    expect(screen.getByText("Top Findings in this Business Unit")).toBeInTheDocument();
    expect(screen.getAllByText("Applications").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Findings").length).toBeGreaterThan(0);
    expect(screen.getByText("Digital Storefront")).toBeInTheDocument();
    expect(screen.getByText("Shipping and Tracking")).toBeInTheDocument();
    expect(screen.getAllByText("No risk data").length).toBeGreaterThan(0);
    expect(screen.getByText("No finding data")).toBeInTheDocument();
    expect(screen.queryByText("Mock 6-month trend")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onOpenOverview).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Digital Storefront/i }));
    expect(onOpenBusinessService).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "digital-storefront" })
    );
  });
});

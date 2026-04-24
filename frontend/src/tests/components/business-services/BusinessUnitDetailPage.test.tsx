import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessUnitDetailPage } from "../../../components/business-services/BusinessUnitDetailPage";
import { useBusinessUnitDetail } from "../../../hooks/topology/useBusinessUnitDetail";

vi.mock("../../../hooks/topology/useBusinessUnitDetail", () => ({
  useBusinessUnitDetail: vi.fn(),
}));

const mockedUseBusinessUnitDetail = vi.mocked(useBusinessUnitDetail);

describe("BusinessUnitDetailPage", () => {
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
    render(
      <BusinessUnitDetailPage
        businessUnitSlug="online-store"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessService={onOpenBusinessService}
      />
    );

    expect(screen.getByText("Business Units")).toBeInTheDocument();
    expect(screen.getByText("Digital Storefront")).toBeInTheDocument();
    expect(screen.getByText("Shipping and Tracking")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Digital Storefront/i }));
    expect(onOpenBusinessService).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "digital-storefront" })
    );
  });
});

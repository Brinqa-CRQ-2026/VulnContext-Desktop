import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServicesOverview } from "../../../components/business-services/BusinessServicesOverview";
import { useBusinessUnits } from "../../../hooks/topology/useBusinessUnits";

vi.mock("../../../hooks/topology/useBusinessUnits", () => ({
  useBusinessUnits: vi.fn(),
}));

const mockedUseBusinessUnits = vi.mocked(useBusinessUnits);

describe("BusinessServicesOverview", () => {
  it("renders live summary cards and business-unit rows", () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [
        {
          company: { name: "Virtucon" },
          business_unit: "Online Store",
          slug: "online-store",
          metrics: {
            total_business_services: 3,
            total_applications: 0,
            total_assets: 12,
            total_findings: 42,
          },
        },
        {
          company: { name: "Cyberdyne Systems" },
          business_unit: "Manufacturing",
          slug: "manufacturing",
          metrics: {
            total_business_services: 2,
            total_applications: 0,
            total_assets: 8,
            total_findings: 17,
          },
        },
      ],
      loading: false,
      error: null,
    });

    render(<BusinessServicesOverview refreshToken={0} onOpenBusinessUnit={vi.fn()} />);

    expect(screen.getByText("Business units")).toBeInTheDocument();
    expect(screen.getAllByText("Business services").length).toBeGreaterThan(0);
    expect(screen.getByText("Open findings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Virtucon/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manufacturing/i })).toBeInTheDocument();
  });

  it("opens the business-unit detail route from a row", () => {
    const onOpenBusinessUnit = vi.fn();
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [
        {
          company: { name: "Virtucon" },
          business_unit: "Online Store",
          slug: "online-store",
          metrics: {
            total_business_services: 3,
            total_applications: 0,
            total_assets: 12,
            total_findings: 42,
          },
        },
      ],
      loading: false,
      error: null,
    });

    render(
      <BusinessServicesOverview
        refreshToken={0}
        onOpenBusinessUnit={onOpenBusinessUnit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Online Store/i }));

    expect(onOpenBusinessUnit).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "online-store" })
    );
  });

  it("shows the schema-not-initialized state when the backend returns 503", () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [],
      loading: false,
      error:
        "Normalized topology tables are not initialized. Apply docs/backend/topology-seed/topology-expansion.sql before using business-unit topology routes.",
    });

    render(<BusinessServicesOverview refreshToken={0} onOpenBusinessUnit={vi.fn()} />);

    expect(screen.getByText("Topology schema not initialized")).toBeInTheDocument();
    expect(
      screen.getByText(/Apply docs\/backend\/topology-seed\/topology-expansion.sql/i)
    ).toBeInTheDocument();
  });
});

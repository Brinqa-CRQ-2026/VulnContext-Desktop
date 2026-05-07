import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BusinessServicesOverview } from "../../../components/business-services/BusinessServicesOverview";
import { useBusinessUnits } from "../../../hooks/topology/business-units/useBusinessUnits";

vi.mock("../../../hooks/topology/business-units/useBusinessUnits", () => ({
  useBusinessUnits: vi.fn(),
}));

const mockedUseBusinessUnits = vi.mocked(useBusinessUnits);

describe("BusinessServicesOverview", () => {
  it("renders company summary cards and company-first business-unit tiles", () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [
        {
          company: { name: "Virtuon" },
          business_unit: "Online Store",
          slug: "online-store",
          description: "Backend supplied online-store description.",
          metrics: {
            total_business_services: 3,
            total_applications: 0,
            total_assets: 12,
            total_findings: 42,
          },
          risk_score: null,
          risk_band: null,
          risk_trend: null,
        },
        {
          company: { name: "Cyberdyne Systems" },
          business_unit: "Manufacturing",
          slug: "manufacturing",
          description: "Backend supplied manufacturing description.",
          metrics: {
            total_business_services: 2,
            total_applications: 0,
            total_assets: 8,
            total_findings: 17,
          },
          risk_score: null,
          risk_band: null,
          risk_trend: null,
        },
      ],
      loading: false,
      error: null,
    });

    render(<BusinessServicesOverview refreshToken={0} onOpenBusinessUnit={vi.fn()} />);

    expect(screen.queryByText("Companies")).not.toBeInTheDocument();
    expect(screen.queryByText("Open findings")).not.toBeInTheDocument();
    expect(screen.getByText("Online Store")).toBeInTheDocument();
    expect(screen.getByText("Manufacturing")).toBeInTheDocument();
    expect(screen.getByText("Backend supplied online-store description.")).toBeInTheDocument();
    expect(screen.getByText("Backend supplied manufacturing description.")).toBeInTheDocument();
    expect(screen.getAllByText("Risk over time")).toHaveLength(2);
    expect(screen.getAllByText("Risk pending")).toHaveLength(2);
    expect(screen.getAllByText("No risk trend data yet")).toHaveLength(2);
    expect(screen.queryByText(/last 6 mo/i)).not.toBeInTheDocument();
    expect(screen.queryByText("High Risk")).not.toBeInTheDocument();
    expect(screen.queryByText(/Main risk/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Findings").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Total findings")).not.toBeInTheDocument();
    expect(screen.queryByText("Critical findings")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Virtuon company card/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cyberdyne Systems company card/i })
    ).toBeInTheDocument();
  });

  it("opens the business-unit detail route from a company card", () => {
    const onOpenBusinessUnit = vi.fn();
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [
        {
          company: { name: "Virtuon" },
          business_unit: "Online Store",
          slug: "online-store",
          description: "Backend supplied online-store description.",
          metrics: {
            total_business_services: 3,
            total_applications: 0,
            total_assets: 12,
            total_findings: 42,
          },
          risk_score: null,
          risk_band: null,
          risk_trend: null,
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

    fireEvent.click(screen.getByRole("button", { name: /Virtuon company card/i }));

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

  it("shows a company load failure state for generic backend errors", () => {
    mockedUseBusinessUnits.mockReturnValue({
      businessUnits: [],
      loading: false,
      error: "Request failed with status code 500",
    });

    render(<BusinessServicesOverview refreshToken={0} onOpenBusinessUnit={vi.fn()} />);

    expect(screen.getByText("Unable to load companies")).toBeInTheDocument();
    expect(
      screen.getByText("The company overview could not be loaded from the backend.")
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardOverview } from "../../../components/dashboard/DashboardOverview";
import { useDashboardOverviewData } from "../../../hooks/dashboard/useDashboardOverviewData";

vi.mock("../../../hooks/dashboard/useDashboardOverviewData", () => ({
  useDashboardOverviewData: vi.fn(),
}));

const mockedUseDashboardOverviewData = vi.mocked(useDashboardOverviewData);

describe("DashboardOverview", () => {
  beforeEach(() => {
    mockedUseDashboardOverviewData.mockReset();
  });

  it("renders the first-load state from the dashboard hook", () => {
    mockedUseDashboardOverviewData.mockReturnValue({
      summary: null,
      loading: true,
      error: null,
    });

    render(<DashboardOverview refreshToken={7} />);

    expect(mockedUseDashboardOverviewData).toHaveBeenCalledWith(7);
    expect(screen.getByText("Loading findings overview")).toBeInTheDocument();
  });

  it("renders summary cards and a non-blocking error message", () => {
    mockedUseDashboardOverviewData.mockReturnValue({
      summary: {
        total_findings: 22,
        risk_bands: { Critical: 2, High: 5, Medium: 10, Low: 5 },
        kevFindingsTotal: 3,
        average_risk_score: 6.3,
      },
      loading: false,
      error: "Summary is stale",
    });

    render(<DashboardOverview refreshToken={0} />);

    expect(screen.getByText("Total Findings")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("Summary is stale")).toBeInTheDocument();
  });
});

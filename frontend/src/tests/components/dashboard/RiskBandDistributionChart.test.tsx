import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskBandDistributionChart } from "../../../components/dashboard/RiskBandDistributionChart";
import type { ScoresSummary } from "../../../types";

const populatedSummary: ScoresSummary = {
  total_findings: 8,
  risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 2 },
  average_risk_score: 6.2,
};

describe("RiskBandDistributionChart", () => {
  it("renders loading and empty chart states", () => {
    const { rerender } = render(
      <RiskBandDistributionChart summary={null} loading />
    );

    expect(screen.getByText("Loading risk band distribution...")).toBeInTheDocument();

    rerender(
      <RiskBandDistributionChart
        summary={{ total_findings: 0, risk_bands: {} }}
        loading={false}
      />
    );

    expect(screen.getByText("No findings available yet.")).toBeInTheDocument();
  });

  it("renders populated chart labels without relying on browser layout", () => {
    render(<RiskBandDistributionChart summary={populatedSummary} loading={false} />);

    expect(screen.getByText("Risk Band Distribution")).toBeInTheDocument();
    expect(screen.getByText("Across all findings currently in the database")).toBeInTheDocument();
    expect(screen.queryByText("No findings available yet.")).not.toBeInTheDocument();
  });
});

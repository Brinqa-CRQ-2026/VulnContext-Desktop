import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SummaryCards } from "../../../components/dashboard/SummaryCards";
import type { ScoresSummary } from "../../../types";

const summary: ScoresSummary = {
  total_findings: 1234,
  risk_bands: { Critical: 9, High: 40, Medium: 70, Low: 12 },
  kevFindingsTotal: 5,
  average_risk_score: 7.234,
};

describe("SummaryCards", () => {
  it("shows placeholders while the first summary load is pending", () => {
    render(<SummaryCards summary={null} loading />);

    expect(screen.getByText("Total Findings")).toBeInTheDocument();
    expect(screen.getAllByText("...")).toHaveLength(4);
  });

  it("formats summary totals and preserves partial-data fallbacks", () => {
    const { rerender } = render(<SummaryCards summary={summary} loading={false} />);

    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();

    rerender(
      <SummaryCards
        summary={{ total_findings: 0, risk_bands: {}, average_risk_score: null }}
        loading={false}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(3);
  });
});

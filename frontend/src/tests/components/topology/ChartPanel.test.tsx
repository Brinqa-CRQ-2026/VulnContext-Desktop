import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartPanel } from "../../../components/topology/shared/ChartPanel";

describe("ChartPanel", () => {
  it("renders title, description, badge, and children for populated data", () => {
    render(
      <ChartPanel
        title="Risk trend"
        description="Monthly risk"
        badge={<span>High</span>}
        loading={false}
        error={null}
        empty={false}
      >
        <div>chart body</div>
      </ChartPanel>
    );

    expect(screen.getByText("Risk trend")).toBeInTheDocument();
    expect(screen.getByText("Monthly risk")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("chart body")).toBeInTheDocument();
  });

  it("prioritizes loading, error, and empty placeholder messages", () => {
    const { rerender } = render(
      <ChartPanel title="Chart" loading error="Failed" empty={false}>
        <div>chart body</div>
      </ChartPanel>
    );

    expect(screen.getByText("Loading data...")).toBeInTheDocument();
    expect(screen.queryByText("chart body")).not.toBeInTheDocument();

    rerender(
      <ChartPanel title="Chart" loading={false} error="Failed" empty={false}>
        <div>chart body</div>
      </ChartPanel>
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();

    rerender(
      <ChartPanel title="Chart" loading={false} error={null} empty emptyMessage="No points">
        <div>chart body</div>
      </ChartPanel>
    );
    expect(screen.getByText("No points")).toBeInTheDocument();
  });
});

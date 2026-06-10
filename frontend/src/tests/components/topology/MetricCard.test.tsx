import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard, MetricGrid } from "../../../components/topology/shared/MetricCard";

describe("MetricCard", () => {
  it("renders string and numeric metric values with optional hint", () => {
    render(
      <MetricGrid>
        <MetricCard label="Assets" value={1234} hint="Across services" />
        <MetricCard label="Status" value="Healthy" />
      </MetricGrid>
    );

    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Across services")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});

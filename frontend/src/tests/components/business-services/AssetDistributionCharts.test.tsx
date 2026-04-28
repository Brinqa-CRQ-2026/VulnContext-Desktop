import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssetDistributionCharts } from "../../../components/business-services/AssetDistributionCharts";

describe("AssetDistributionCharts", () => {
  it("renders chart cards and includes unscored only when present", () => {
    render(
      <AssetDistributionCharts
        analytics={{
          total_assets: 7,
          asset_criticality_distribution: {
            low: 1,
            medium: 2,
            high: 1,
            critical: 2,
            unscored: 1,
          },
          finding_risk_distribution: {
            low: 0,
            medium: 1,
            high: 4,
            critical: 2,
            unscored: 0,
          },
        }}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText("Asset criticality spread")).toBeInTheDocument();
    expect(screen.getByText("Finding risk spread")).toBeInTheDocument();
    expect(screen.getAllByText("7 assets")).toHaveLength(2);
    expect(screen.getByText("Unscored 1")).toBeInTheDocument();
  });
});

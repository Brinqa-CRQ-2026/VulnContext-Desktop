import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetFindingsAnalytics } = vi.hoisted(() => ({
  getAssetFindingsAnalytics: vi.fn(),
}));

vi.mock("../../../api/topology", () => ({
  getAssetFindingsAnalytics,
}));

import { useAssetFindingsAnalytics } from "../../../hooks/topology/useAssetFindingsAnalytics";

describe("useAssetFindingsAnalytics", () => {
  beforeEach(() => {
    getAssetFindingsAnalytics.mockReset();
  });

  it("loads analytics for the full filtered result set", async () => {
    getAssetFindingsAnalytics.mockResolvedValue({
      asset: { asset_id: "asset-10" },
      analytics: {
        total_findings: 8,
        kev_findings: 3,
        critical_high_findings: 5,
        highest_risk_band: "Critical",
        average_risk_score: 8.6,
        max_risk_score: 9.9,
        oldest_priority_age_days: 44,
        risk_bands: { Critical: 2, High: 3, Medium: 2, Low: 1 },
      },
    });

    const { result } = renderHook(() =>
      useAssetFindingsAnalytics("asset-10", {
        bandFilter: "High",
        kevOnly: true,
        source: "Brinqa",
        search: "openssl",
        refreshToken: 0,
      })
    );

    await waitFor(() =>
      expect(getAssetFindingsAnalytics).toHaveBeenCalledWith("asset-10", {
        riskBand: "High",
        kevOnly: true,
        source: "Brinqa",
        search: "openssl",
      })
    );
    await waitFor(() => expect(result.current.analytics?.analytics.total_findings).toBe(8));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBusinessUnitRiskOverview } = vi.hoisted(() => ({
  getBusinessUnitRiskOverview: vi.fn(),
}));

vi.mock("../../../api/topology", () => ({
  getBusinessUnitRiskOverview,
}));

import { useBusinessUnitRiskOverview } from "../../../hooks/topology/useBusinessUnitRiskOverview";

describe("useBusinessUnitRiskOverview", () => {
  beforeEach(() => {
    getBusinessUnitRiskOverview.mockReset();
  });

  it("loads the business-unit risk overview", async () => {
    getBusinessUnitRiskOverview.mockResolvedValue({
      business_unit: "Online Store",
      slug: "online-store",
      risk_score: 8.4,
      risk_band: "High",
      risk_trend: [{ period: "Jan 2024", score: 8.1 }],
      severity_counts: { Critical: 2, High: 3, Medium: 4, Low: 5 },
      finding_risk_distribution: {
        low: 5,
        medium: 4,
        high: 3,
        critical: 2,
        unscored: 0,
      },
    });

    const { result } = renderHook(() => useBusinessUnitRiskOverview("online-store", 0));

    await waitFor(() =>
      expect(getBusinessUnitRiskOverview).toHaveBeenCalledWith("online-store")
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.riskOverview?.risk_band).toBe("High");
  });

  it("returns a not-found error when no slug is provided", async () => {
    const { result } = renderHook(() => useBusinessUnitRiskOverview(null, 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.riskOverview).toBeNull();
    expect(result.current.error).toBe("Business unit risk overview not found.");
    expect(getBusinessUnitRiskOverview).not.toHaveBeenCalled();
  });
});

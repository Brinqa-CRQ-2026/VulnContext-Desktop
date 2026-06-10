import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getScoresSummary } = vi.hoisted(() => ({
  getScoresSummary: vi.fn(),
}));

vi.mock("../../../api/findings", () => ({
  getScoresSummary,
}));

import { useDashboardOverviewData } from "../../../hooks/dashboard/useDashboardOverviewData";

describe("useDashboardOverviewData", () => {
  beforeEach(() => {
    getScoresSummary.mockReset();
  });

  it("loads summary data on mount", async () => {
    getScoresSummary.mockResolvedValue({
      total_findings: 12,
      risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 6 },
      average_risk_score: 5.7,
    });

    const { result } = renderHook(({ refreshToken }) => useDashboardOverviewData(refreshToken), {
      initialProps: { refreshToken: 0 },
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getScoresSummary).toHaveBeenCalledTimes(1);
    expect(result.current.summary?.total_findings).toBe(12);
    expect(result.current.summary?.average_risk_score).toBe(5.7);
    expect(result.current.error).toBeNull();
  });

  it("sets a readable error when loading fails", async () => {
    getScoresSummary.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDashboardOverviewData(0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load dashboard metrics.");
  });

  it("reloads when refreshToken changes", async () => {
    getScoresSummary.mockResolvedValue({
      total_findings: 1,
      risk_bands: { Critical: 0, High: 0, Medium: 1, Low: 0 },
    });

    const { rerender } = renderHook(
      ({ refreshToken }) => useDashboardOverviewData(refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getScoresSummary).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getScoresSummary).toHaveBeenCalledTimes(2));
  });
});

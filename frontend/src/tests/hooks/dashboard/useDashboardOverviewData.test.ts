import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getScoresSummary, getSourcesSummary } = vi.hoisted(() => ({
  getScoresSummary: vi.fn(),
  getSourcesSummary: vi.fn(),
}));

vi.mock("../../../api/findings", () => ({
  getScoresSummary,
}));

vi.mock("../../../api/sources", () => ({
  getSourcesSummary,
}));

import { useDashboardOverviewData } from "../../../hooks/dashboard/useDashboardOverviewData";

describe("useDashboardOverviewData", () => {
  beforeEach(() => {
    getScoresSummary.mockReset();
    getSourcesSummary.mockReset();
  });

  it("loads summary and source data together on mount", async () => {
    getScoresSummary.mockResolvedValue({
      total_findings: 12,
      risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 6 },
    });
    getSourcesSummary.mockResolvedValue([{ source: "Qualys", total_findings: 12 }]);

    const { result } = renderHook(({ refreshToken }) => useDashboardOverviewData(refreshToken), {
      initialProps: { refreshToken: 0 },
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getScoresSummary).toHaveBeenCalledTimes(1);
    expect(getSourcesSummary).toHaveBeenCalledTimes(1);
    expect(result.current.summary?.total_findings).toBe(12);
    expect(result.current.sources).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("sets a readable error when loading fails", async () => {
    getScoresSummary.mockRejectedValue(new Error("boom"));
    getSourcesSummary.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardOverviewData(0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load dashboard metrics.");
  });

  it("reloads when refreshToken changes", async () => {
    getScoresSummary.mockResolvedValue({
      total_findings: 1,
      risk_bands: { Critical: 0, High: 0, Medium: 1, Low: 0 },
    });
    getSourcesSummary.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ refreshToken }) => useDashboardOverviewData(refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getScoresSummary).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getScoresSummary).toHaveBeenCalledTimes(2));
  });
});

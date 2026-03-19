import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAllFindings, getFindingsByRiskBand } = vi.hoisted(() => ({
  getAllFindings: vi.fn(),
  getFindingsByRiskBand: vi.fn(),
}));

vi.mock("../../../api/findings", () => ({
  getAllFindings,
  getFindingsByRiskBand,
}));

import { usePaginatedFindings } from "../../../hooks/findings/usePaginatedFindings";

const pageResult = {
  items: [{ id: 1, source: "Qualys" }],
  total: 40,
  page: 1,
  page_size: 20,
};

describe("usePaginatedFindings", () => {
  beforeEach(() => {
    getAllFindings.mockReset();
    getFindingsByRiskBand.mockReset();
    getAllFindings.mockResolvedValue(pageResult);
    getFindingsByRiskBand.mockResolvedValue(pageResult);
  });

  it("loads all findings when the band filter is All", async () => {
    const { result } = renderHook(() => usePaginatedFindings(20, "All", "risk_score", "desc"));

    await waitFor(() =>
      expect(getAllFindings).toHaveBeenCalledWith(1, 20, "risk_score", "desc", null)
    );
    expect(getFindingsByRiskBand).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.data).toEqual(pageResult));
  });

  it("loads risk-band filtered findings when the filter is not All", async () => {
    renderHook(() => usePaginatedFindings(20, "High", "risk_score", "desc"));

    await waitFor(() =>
      expect(getFindingsByRiskBand).toHaveBeenCalledWith("High", 1, 20, "risk_score", "desc", null)
    );
  });

  it("passes paging, sort, and source parameters", async () => {
    const { result } = renderHook(() =>
      usePaginatedFindings(20, "All", "source", "asc", "Qualys")
    );

    await waitFor(() =>
      expect(getAllFindings).toHaveBeenCalledWith(1, 20, "source", "asc", "Qualys")
    );

    act(() => result.current.setPage(2));

    await waitFor(() =>
      expect(getAllFindings).toHaveBeenCalledWith(2, 20, "source", "asc", "Qualys")
    );
  });

  it("resets the page when filters change", async () => {
    const { result, rerender } = renderHook(
      ({ bandFilter, sortBy, sortOrder, sourceFilter }) =>
        usePaginatedFindings(20, bandFilter, sortBy, sortOrder, sourceFilter),
      {
        initialProps: {
          bandFilter: "All" as const,
          sortBy: "risk_score" as const,
          sortOrder: "desc" as const,
          sourceFilter: null as string | null,
        },
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.page).toBe(2));

    rerender({
      bandFilter: "Critical",
      sortBy: "risk_score",
      sortOrder: "desc",
      sourceFilter: null,
    });

    await waitFor(() => expect(result.current.page).toBe(1));

    rerender({
      bandFilter: "Critical",
      sortBy: "cvss_score",
      sortOrder: "asc",
      sourceFilter: "Qualys",
    });

    await waitFor(() =>
      expect(getFindingsByRiskBand).toHaveBeenCalledWith(
        "Critical",
        1,
        20,
        "cvss_score",
        "asc",
        "Qualys"
      )
    );
  });

  it("sets an error on failure and reloads on refreshToken changes", async () => {
    getAllFindings.mockRejectedValueOnce(new Error("boom"));

    const { result, rerender } = renderHook(
      ({ refreshToken }) => usePaginatedFindings(20, "All", "risk_score", "desc", null, refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(result.current.error).toBe("Failed to load findings."));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getAllFindings).toHaveBeenCalledTimes(2));
  });
});

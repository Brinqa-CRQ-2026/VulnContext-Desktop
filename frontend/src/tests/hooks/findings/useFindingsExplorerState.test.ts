import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePaginatedFindings, useSourcesSummary } = vi.hoisted(() => ({
  usePaginatedFindings: vi.fn(),
  useSourcesSummary: vi.fn(),
}));

vi.mock("../../../hooks/findings/usePaginatedFindings", () => ({
  usePaginatedFindings,
}));

vi.mock("../../../hooks/sources/useSourcesSummary", () => ({
  useSourcesSummary,
}));

import { useFindingsExplorerState } from "../../../hooks/findings/useFindingsExplorerState";

describe("useFindingsExplorerState", () => {
  beforeEach(() => {
    useSourcesSummary.mockReset();
    usePaginatedFindings.mockReset();
    useSourcesSummary.mockReturnValue({
      sources: [
        { source: "Qualys", total_findings: 10, risk_bands: { Critical: 1, High: 2, Medium: 3, Low: 4 } },
      ],
    });
    usePaginatedFindings.mockReturnValue({
      page: 2,
      pageSize: 20,
      setPage: vi.fn(),
      data: {
        items: [
          { id: "finding-1", source: "Qualys", isKev: true },
          { id: "finding-2", source: "Qualys", isKev: false },
        ],
        total: 100,
        page: 2,
        page_size: 20,
      },
      loading: false,
      error: null,
    });
  });

  it("prepares findings explorer data and filters KEV rows locally", () => {
    const { result } = renderHook(() => useFindingsExplorerState(0));

    expect(result.current.visibleFindings).toHaveLength(2);
    expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.sortLabel).toBe("Sort by Priority Score");

    act(() => result.current.setShowKevOnly(true));

    expect(result.current.visibleFindings).toEqual([
      { id: "finding-1", source: "Qualys", isKev: true },
    ]);
  });

  it("passes source and sort filters into paginated findings", () => {
    const { result } = renderHook(() => useFindingsExplorerState(1));

    act(() => result.current.setSourceFilter("Qualys"));
    act(() => result.current.setSortBy("source"));
    act(() => result.current.setSortOrder("asc"));

    expect(usePaginatedFindings).toHaveBeenLastCalledWith(
      20,
      "All",
      "source",
      "asc",
      "Qualys",
      1
    );
  });
});

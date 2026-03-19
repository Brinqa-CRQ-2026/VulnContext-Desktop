import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSourcesSummary } = vi.hoisted(() => ({
  getSourcesSummary: vi.fn(),
}));

vi.mock("../../../api/sources", () => ({
  getSourcesSummary,
}));

import { useSourcesSummary } from "../../../hooks/sources/useSourcesSummary";

describe("useSourcesSummary", () => {
  beforeEach(() => {
    getSourcesSummary.mockReset();
  });

  it("loads source summaries on mount", async () => {
    getSourcesSummary.mockResolvedValue([{ source: "Qualys", total_findings: 12 }]);

    const { result } = renderHook(() => useSourcesSummary(0));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sources).toEqual([{ source: "Qualys", total_findings: 12 }]);
    expect(result.current.error).toBeNull();
  });

  it("stores an error on failure", async () => {
    getSourcesSummary.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useSourcesSummary(0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load sources.");
  });

  it("reloads when refreshToken changes", async () => {
    getSourcesSummary.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ refreshToken }) => useSourcesSummary(refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getSourcesSummary).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getSourcesSummary).toHaveBeenCalledTimes(2));
  });
});

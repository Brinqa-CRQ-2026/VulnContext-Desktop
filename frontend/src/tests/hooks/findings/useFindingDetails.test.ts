import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFindingById } = vi.hoisted(() => ({
  getFindingById: vi.fn(),
}));

vi.mock("../../../api/findings", () => ({
  getFindingById,
}));

import { useFindingDetails } from "../../../hooks/findings/useFindingDetails";

describe("useFindingDetails", () => {
  beforeEach(() => {
    getFindingById.mockReset();
  });

  it("loads finding details on mount", async () => {
    getFindingById.mockResolvedValue({ id: 42, source: "Qualys" });

    const { result } = renderHook(() => useFindingDetails(42, 0));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getFindingById).toHaveBeenCalledWith(42);
    expect(result.current.finding?.id).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it("stores the thrown error message", async () => {
    getFindingById.mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => useFindingDetails(42, 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("not found");
  });

  it("reloads when the finding id changes", async () => {
    getFindingById.mockResolvedValue({ id: 42, source: "Qualys" });

    const { rerender } = renderHook(
      ({ id, refreshToken }) => useFindingDetails(id, refreshToken),
      { initialProps: { id: 42, refreshToken: 0 } }
    );

    await waitFor(() => expect(getFindingById).toHaveBeenCalledWith(42));

    rerender({ id: 100, refreshToken: 0 });

    await waitFor(() => expect(getFindingById).toHaveBeenCalledWith(100));
  });

  it("reloads when refreshToken changes", async () => {
    getFindingById.mockResolvedValue({ id: 42, source: "Qualys" });

    const { rerender } = renderHook(
      ({ refreshToken }) => useFindingDetails(42, refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getFindingById).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getFindingById).toHaveBeenCalledTimes(2));
  });
});

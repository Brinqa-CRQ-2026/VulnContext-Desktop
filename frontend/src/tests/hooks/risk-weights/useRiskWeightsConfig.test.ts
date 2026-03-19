import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRiskWeights } = vi.hoisted(() => ({
  getRiskWeights: vi.fn(),
}));

vi.mock("../../../api/risk-weights", () => ({
  getRiskWeights,
}));

import { useRiskWeightsConfig } from "../../../hooks/risk-weights/useRiskWeightsConfig";

describe("useRiskWeightsConfig", () => {
  beforeEach(() => {
    getRiskWeights.mockReset();
  });

  it("loads weights on mount", async () => {
    getRiskWeights.mockResolvedValue({
      cvss_weight: 0.2,
      epss_weight: 0.2,
      kev_weight: 0.2,
      asset_criticality_weight: 0.2,
      context_weight: 0.2,
    });

    const { result } = renderHook(() => useRiskWeightsConfig(0));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.weights?.cvss_weight).toBe(0.2);
    expect(result.current.error).toBeNull();
  });

  it("stores a readable error when loading fails", async () => {
    getRiskWeights.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useRiskWeightsConfig(0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load risk weights.");
  });

  it("reloads when refreshToken changes", async () => {
    getRiskWeights.mockResolvedValue({
      cvss_weight: 0.2,
      epss_weight: 0.2,
      kev_weight: 0.2,
      asset_criticality_weight: 0.2,
      context_weight: 0.2,
    });

    const { rerender } = renderHook(
      ({ refreshToken }) => useRiskWeightsConfig(refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getRiskWeights).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getRiskWeights).toHaveBeenCalledTimes(2));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetsAnalytics } = vi.hoisted(() => ({
  getAssetsAnalytics: vi.fn(),
}));

vi.mock("../../../api/topology", () => ({
  getAssetsAnalytics,
}));

import { useAssetsAnalytics } from "../../../hooks/topology/useAssetsAnalytics";

describe("useAssetsAnalytics", () => {
  beforeEach(() => {
    getAssetsAnalytics.mockReset();
  });

  it("loads analytics for the full filtered asset result set", async () => {
    getAssetsAnalytics.mockResolvedValue({
      total_assets: 8,
      asset_criticality_distribution: {
        low: 1,
        medium: 3,
        high: 2,
        critical: 1,
        unscored: 1,
      },
      finding_risk_distribution: {
        low: 2,
        medium: 2,
        high: 3,
        critical: 1,
        unscored: 0,
      },
    });

    const { result } = renderHook(() =>
      useAssetsAnalytics({
        businessUnit: "Online Store",
        businessService: "Digital Storefront",
        application: "Identity Verify",
        status: "Confirmed active",
        environment: "Production",
        compliance: "PCI",
        search: "openssl",
        directOnly: false,
        refreshToken: 0,
      })
    );

    await waitFor(() =>
      expect(getAssetsAnalytics).toHaveBeenCalledWith({
        businessUnit: "Online Store",
        businessService: "Digital Storefront",
        application: "Identity Verify",
        status: "Confirmed active",
        environment: "Production",
        compliance: "PCI",
        search: "openssl",
        directOnly: false,
      })
    );
    await waitFor(() => expect(result.current.analytics?.total_assets).toBe(8));
  });
});

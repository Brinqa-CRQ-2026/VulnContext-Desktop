import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetEnrichment } = vi.hoisted(() => ({
  getAssetEnrichment: vi.fn(),
}));

const { requestBrinqaSessionReset } = vi.hoisted(() => ({
  requestBrinqaSessionReset: vi.fn(),
}));

vi.mock("../../../api/topology", () => ({
  getAssetEnrichment,
}));

vi.mock("../../../auth/electronBrinqa", () => ({
  requestBrinqaSessionReset,
}));

import { useAssetEnrichment } from "../../../hooks/topology/useAssetEnrichment";

describe("useAssetEnrichment", () => {
  beforeEach(() => {
    getAssetEnrichment.mockReset();
    requestBrinqaSessionReset.mockReset();
    requestBrinqaSessionReset.mockResolvedValue(undefined);
  });

  it("loads enrichment on mount by default", async () => {
    getAssetEnrichment.mockResolvedValue({ asset_id: "asset-10", status: "success" });

    const { result } = renderHook(() => useAssetEnrichment("asset-10", 0));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(getAssetEnrichment).toHaveBeenCalledWith("asset-10"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrichment).toEqual({ asset_id: "asset-10", status: "success" });
  });

  it("resets and reloads when the asset or refresh token changes", async () => {
    getAssetEnrichment.mockResolvedValue({ asset_id: "asset-10", status: "success" });

    const { result, rerender } = renderHook(
      ({ assetId, refreshToken }) => useAssetEnrichment(assetId, refreshToken),
      { initialProps: { assetId: "asset-10", refreshToken: 0 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAssetEnrichment).toHaveBeenCalledTimes(1);

    rerender({ assetId: "asset-11", refreshToken: 0 });
    await waitFor(() => expect(getAssetEnrichment).toHaveBeenCalledWith("asset-11"));

    rerender({ assetId: "asset-11", refreshToken: 1 });
    await waitFor(() => expect(getAssetEnrichment).toHaveBeenCalledTimes(3));
  });

  it("stores errors without blocking manual retry", async () => {
    getAssetEnrichment.mockRejectedValueOnce(new Error("missing_auth_token"));
    getAssetEnrichment.mockResolvedValueOnce({ asset_id: "asset-10", status: "partial_success" });

    const { result } = renderHook(() => useAssetEnrichment("asset-10", 0));

    await waitFor(() => expect(result.current.error).toBe("missing_auth_token"));
    expect(result.current.enrichment).toBeNull();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() =>
      expect(result.current.enrichment).toEqual({
        asset_id: "asset-10",
        status: "partial_success",
      })
    );
    expect(result.current.error).toBeNull();
  });

  it("resets auth and reopens login when enrichment is unauthorized", async () => {
    getAssetEnrichment.mockResolvedValue({
      asset_id: "asset-10",
      status: "unauthorized_token",
      reason: "brinqa_unauthorized",
    });

    renderHook(() => useAssetEnrichment("asset-10", 0));

    await waitFor(() =>
      expect(requestBrinqaSessionReset).toHaveBeenCalledWith({
        reason: "unauthorized",
        reopenLogin: true,
        includeRemoteLogout: true,
      })
    );
  });

  it("can disable auto-load and use manual loading", async () => {
    getAssetEnrichment.mockResolvedValue({ asset_id: "asset-10", status: "success" });

    const { result } = renderHook(() =>
      useAssetEnrichment("asset-10", 0, { loadOnMount: false })
    );

    expect(getAssetEnrichment).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    await waitFor(() => expect(getAssetEnrichment).toHaveBeenCalledWith("asset-10"));
  });
});

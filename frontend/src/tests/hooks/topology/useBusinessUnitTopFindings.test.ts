import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBusinessUnitFindings } = vi.hoisted(() => ({
  getBusinessUnitFindings: vi.fn(),
}));

vi.mock("../../../api/topology", () => ({
  getBusinessUnitFindings,
}));

import { useBusinessUnitTopFindings } from "../../../hooks/topology/useBusinessUnitTopFindings";

describe("useBusinessUnitTopFindings", () => {
  beforeEach(() => {
    getBusinessUnitFindings.mockReset();
  });

  it("loads the scoped findings page with the expected query params", async () => {
    getBusinessUnitFindings.mockResolvedValue({
      items: [
        {
          id: "finding-1",
          source: "Brinqa",
          asset_id: "asset-1",
        },
      ],
      total: 1,
      page: 1,
      page_size: 5,
    });

    const { result } = renderHook(() =>
      useBusinessUnitTopFindings("online-store", {
        pageSize: 5,
        sortBy: "risk_score",
        sortOrder: "desc",
        source: "Brinqa",
        riskBand: "High",
        search: "openssl",
        refreshToken: 0,
      })
    );

    await waitFor(() =>
      expect(getBusinessUnitFindings).toHaveBeenCalledWith("online-store", {
        page: 1,
        pageSize: 5,
        sortBy: "risk_score",
        sortOrder: "desc",
        source: "Brinqa",
        riskBand: "High",
        search: "openssl",
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.total).toBe(1);
  });

  it("returns a not-found error when no business unit slug is provided", async () => {
    const { result } = renderHook(() => useBusinessUnitTopFindings(null, {}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Business unit findings not found.");
    expect(getBusinessUnitFindings).not.toHaveBeenCalled();
  });
});

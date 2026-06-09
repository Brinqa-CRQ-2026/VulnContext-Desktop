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
    getFindingById.mockResolvedValue({ id: "finding-42", source: "Qualys" });

    const { result } = renderHook(() => useFindingDetails("finding-42", 0));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getFindingById).toHaveBeenCalledWith("finding-42");
    expect(result.current.finding?.id).toBe("finding-42");
    expect(result.current.error).toBeNull();
  });

  it("preserves enriched finding detail fields from the API", async () => {
    getFindingById.mockResolvedValue({
      id: "finding-42",
      source: "Brinqa",
      asset_id: "asset-42",
      cveDescription: "NVD technical context.",
      nvd_vuln_status: "Analyzed",
      cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      cvss_exploitability_score: 3.9,
      privileges_required: "NONE",
      isKev: true,
      kevVendorProject: "Example Vendor",
      primary_cwe_id: "CWE-502",
      affected_products: [{ product: "widget", version: "1.0" }],
      reference_groups: {
        "Vendor Advisory": [{ url: "https://vendor.example/advisory" }],
      },
    });

    const { result } = renderHook(() => useFindingDetails("finding-42", 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.finding?.cveDescription).toBe("NVD technical context.");
    expect(result.current.finding?.nvd_vuln_status).toBe("Analyzed");
    expect(result.current.finding?.cvss_exploitability_score).toBe(3.9);
    expect(result.current.finding?.privileges_required).toBe("NONE");
    expect(result.current.finding?.isKev).toBe(true);
    expect(result.current.finding?.kevVendorProject).toBe("Example Vendor");
    expect(result.current.finding?.primary_cwe_id).toBe("CWE-502");
    expect(result.current.finding?.affected_products?.[0]?.product).toBe("widget");
    expect(result.current.finding?.reference_groups?.["Vendor Advisory"]?.[0]?.url).toBe(
      "https://vendor.example/advisory"
    );
  });

  it("stores the thrown error message", async () => {
    getFindingById.mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => useFindingDetails("finding-42", 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("not found");
  });

  it("reloads when the finding id changes", async () => {
    getFindingById.mockResolvedValue({ id: "finding-42", source: "Qualys" });

    const { rerender } = renderHook(
      ({ id, refreshToken }) => useFindingDetails(id, refreshToken),
      { initialProps: { id: "finding-42", refreshToken: 0 } }
    );

    await waitFor(() => expect(getFindingById).toHaveBeenCalledWith("finding-42"));

    rerender({ id: "finding-100", refreshToken: 0 });

    await waitFor(() => expect(getFindingById).toHaveBeenCalledWith("finding-100"));
  });

  it("reloads when refreshToken changes", async () => {
    getFindingById.mockResolvedValue({ id: "finding-42", source: "Qualys" });

    const { rerender } = renderHook(
      ({ refreshToken }) => useFindingDetails("finding-42", refreshToken),
      { initialProps: { refreshToken: 0 } }
    );

    await waitFor(() => expect(getFindingById).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getFindingById).toHaveBeenCalledTimes(2));
  });
});

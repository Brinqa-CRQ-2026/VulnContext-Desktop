import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssetFindingsPage } from "../../../components/business-services/AssetFindingsPage";
import { useAssetFindings } from "../../../hooks/topology/useAssetFindings";

vi.mock("../../../hooks/topology/useAssetFindings", () => ({
  useAssetFindings: vi.fn(),
}));

const mockedUseAssetFindings = vi.mocked(useAssetFindings);

describe("AssetFindingsPage", () => {
  it("renders asset findings in a table and opens a finding", () => {
    mockedUseAssetFindings.mockReturnValue({
      assetFindings: {
        asset: {
          asset_id: "asset-10",
          hostname: "identity-verify-01",
          finding_count: 2,
        },
        total: 2,
        page: 1,
        page_size: 10,
        items: [
          {
            id: "finding-1",
            display_name: "TLS Weak Cipher",
            cve_id: "CVE-2024-1111",
            risk_band: "Medium",
            risk_score: 6.1,
            source_risk_score: 5.4,
            cvss_score: 7.2,
            epss_score: 0.1234,
            age_in_days: 14,
            status: "Open",
            lifecycle_status: "Active",
            isKev: false,
            source: "Qualys",
          },
          {
            id: "finding-2",
            display_name: "Remote Code Execution",
            cve_id: "CVE-2024-9999",
            risk_band: "Critical",
            risk_score: 9.8,
            source_risk_score: 8.4,
            cvss_score: 9.1,
            epss_score: 0.9911,
            age_in_days: 30,
            status: "Open",
            lifecycle_status: "Active",
            isKev: true,
            source: "Qualys",
          },
        ],
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 10,
    });

    const onOpenFinding = vi.fn();
    render(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        applicationSlug="identity-verify"
        assetId="asset-10"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenApplication={vi.fn()}
        onOpenFinding={onOpenFinding}
      />
    );

    expect(screen.getByText("Business Units")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Finding$/i })).toBeInTheDocument();
    expect(screen.getByText("Sort by display risk")).toBeInTheDocument();
    expect(screen.queryByText("Showing")).not.toBeInTheDocument();
    expect(screen.getByText("CVE-2024-9999")).toBeInTheDocument();
    expect(screen.getByText("9.1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Remote Code Execution"));
    expect(onOpenFinding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "finding-2" }),
      expect.objectContaining({
        mode: "asset",
        assetId: "asset-10",
        assetLabel: "identity-verify-01",
      })
    );
  });

  it("shows the findings table rows in the server-provided order", () => {
    mockedUseAssetFindings.mockReturnValue({
      assetFindings: {
        asset: {
          asset_id: "asset-11",
          hostname: "asset-11-host",
          finding_count: 2,
        },
        total: 2,
        page: 1,
        page_size: 10,
        items: [
          {
            id: "finding-z",
            display_name: "Zulu Finding",
            risk_band: "Low",
            risk_score: 1.1,
            source: "Qualys",
          },
          {
            id: "finding-a",
            display_name: "Alpha Finding",
            risk_band: "Critical",
            risk_score: 9.9,
            source: "Qualys",
          },
        ],
      },
      loading: false,
      error: null,
      page: 1,
      setPage: vi.fn(),
      pageSize: 10,
    });

    render(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        assetId="asset-11"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zulu Finding");
    expect(rows[2]).toHaveTextContent("Alpha Finding");
  });
});

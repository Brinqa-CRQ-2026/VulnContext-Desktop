import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RiskTable } from "../../../components/dashboard/RiskTable";
import { useFindingsExplorerState } from "../../../hooks/findings/useFindingsExplorerState";

vi.mock("../../../hooks/findings/useFindingsExplorerState", () => ({
  useFindingsExplorerState: vi.fn(),
}));

const mockedUseFindingsExplorerState = vi.mocked(useFindingsExplorerState);

describe("RiskTable", () => {
  it("shows risk score, asset, and business context without vendor risk column", () => {
    mockedUseFindingsExplorerState.mockReturnValue({
      bandFilter: "All",
      setBandFilter: vi.fn(),
      sortBy: "risk_score",
      setSortBy: vi.fn(),
      sortOrder: "desc",
      setSortOrder: vi.fn(),
      toggleSortOrder: vi.fn(),
      sourceFilter: "All",
      setSourceFilter: vi.fn(),
      showKevOnly: false,
      setShowKevOnly: vi.fn(),
      sources: [],
      page: 1,
      pageSize: 20,
      data: null,
      loading: false,
      error: null,
      visibleFindings: [
        {
          id: "finding-1",
          source: "Brinqa",
          asset_id: "asset-1",
          display_name: "OpenSSL Vulnerability",
          target_ids: "asset-1",
          target_names: "api-gateway-01",
          business_service: "Digital Storefront",
          application: "Identity Verify",
          risk_score: 8.6,
          risk_band: "High",
          source_risk_score: 5.4,
          cvss_score: 7.8,
          epss_score: 0.1245,
          age_in_days: 12,
          lifecycle_status: "Active",
          isKev: false,
        },
      ],
      total: 1,
      totalPages: 1,
      pageNumbers: [1],
      goToPage: vi.fn(),
      sortLabel: "Sort by Risk Score",
    });

    render(
      <RiskTable
        refreshToken={0}
        onOpenIntegrations={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    expect(screen.getByText("Findings prioritized by Risk Score")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Asset" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Business service" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Application" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Target" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "EPSS" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Age" })).not.toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Risk Score" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Display risk" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Vendor risk" })).not.toBeInTheDocument();
    expect(screen.getByText("Digital Storefront")).toBeInTheDocument();
    expect(screen.getByText("Identity Verify")).toBeInTheDocument();
  });
});

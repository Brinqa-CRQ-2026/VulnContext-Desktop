import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssetFindingsPage } from "../../../components/business-services/AssetFindingsPage";
import { useAssetDetail } from "../../../hooks/topology/assets/useAssetDetail";
import { useAssetFindings } from "../../../hooks/topology/assets/useAssetFindings";
import { useAssetFindingsAnalytics } from "../../../hooks/topology/assets/useAssetFindingsAnalytics";

vi.mock("../../../hooks/topology/assets/useAssetFindings", () => ({
  useAssetFindings: vi.fn(),
}));
vi.mock("../../../hooks/topology/assets/useAssetDetail", () => ({
  useAssetDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/assets/useAssetFindingsAnalytics", () => ({
  useAssetFindingsAnalytics: vi.fn(),
}));

const mockedUseAssetFindings = vi.mocked(useAssetFindings);
const mockedUseAssetDetail = vi.mocked(useAssetDetail);
const mockedUseAssetFindingsAnalytics = vi.mocked(useAssetFindingsAnalytics);

function seedAssetHooks() {
  mockedUseAssetDetail.mockReturnValue({
    assetDetail: {
      asset_id: "asset-10",
      hostname: "identity-verify-01",
      business_unit: "Online Store",
      business_service: "Digital Storefront",
      application: "Identity Verify",
      finding_count: 2,
      status: "Active",
      environment: "production",
      asset_context_score: 9,
      aggregated_finding_risk: 8.7,
      owner: null,
      service_team: null,
      device_type: "Server",
      category: "Compute",
      internal_or_external: "Internal",
      last_scanned: null,
      last_authenticated_scan: null,
      detail_source: null,
      detail_fetched_at: null,
    },
    loading: false,
    error: null,
  });
  mockedUseAssetFindingsAnalytics.mockReturnValue({
    analytics: {
      asset: {
        asset_id: "asset-10",
        hostname: "identity-verify-01",
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        application: "Identity Verify",
        status: "Active",
        environment: "production",
      },
      analytics: {
        total_findings: 8,
        kev_findings: 3,
        critical_high_findings: 5,
        highest_risk_band: "Critical",
        average_risk_score: 8.6,
        max_risk_score: 9.9,
        oldest_priority_age_days: 44,
        risk_bands: {
          Critical: 2,
          High: 3,
          Medium: 2,
          Low: 1,
        },
      },
    },
    loading: false,
    error: null,
  });
}

function seedFindingsHook() {
  mockedUseAssetFindings.mockReturnValue({
    assetFindings: {
      asset: {
        asset_id: "asset-10",
        hostname: "identity-verify-01",
        business_unit: "Online Store",
        business_service: "Digital Storefront",
        application: "Identity Verify",
        finding_count: 2,
        asset_context_score: 9,
        aggregated_finding_risk: 8.7,
      },
      total: 2,
      page: 1,
      page_size: 10,
      items: [
        {
          id: "finding-1",
          asset_id: "asset-10",
          display_name: "TLS Weak Cipher",
          cve_id: "CVE-2024-1111",
          risk_band: "High",
          risk_score: 8.1,
          source_risk_score: 5.4,
          cvss_score: 7.2,
          epss_score: 0.1234,
          age_in_days: 14,
          status: "Fixed",
          lifecycle_status: "Inactive",
          isKev: false,
          source: "Qualys",
        },
        {
          id: "finding-2",
          asset_id: "asset-10",
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
}

describe("AssetFindingsPage", () => {
  it("renders the compact asset-first layout and opens a finding", () => {
    seedFindingsHook();
    seedAssetHooks();

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

    expect(screen.queryByText("Asset overview")).not.toBeInTheDocument();
    expect(screen.getByText("Finding risk spread")).toBeInTheDocument();
    expect(screen.queryByText("Asset Findings")).not.toBeInTheDocument();
    expect(screen.getAllByText("Digital Storefront").length).toBeGreaterThan(0);
    expect(screen.getAllByText("identity-verify-01").length).toBeGreaterThan(0);
    expect(screen.queryByText("Server")).not.toBeInTheDocument();
    expect(screen.queryByText("Asset ID asset-10")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back to Asset List/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.queryByText("production")).not.toBeInTheDocument();
    expect(screen.queryByText("Compute")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal")).not.toBeInTheDocument();
    expect(screen.getByText("High Risk Findings")).toBeInTheDocument();
    expect(screen.queryByText("Enrichment loaded")).not.toBeInTheDocument();
    expect(screen.getByText("Asset Criticality Score")).toBeInTheDocument();
    expect(screen.getByText("Asset Risk Score")).toBeInTheDocument();
    expect(screen.getByText("7.3")).toBeInTheDocument();
    expect(screen.getByText("9.3")).toBeInTheDocument();
    expect(screen.getByText("KEV Findings")).toBeInTheDocument();
    const priorityCard = screen.getByText("High Risk Findings").closest(".rounded-xl");
    expect(priorityCard).not.toBeNull();
    expect(within(priorityCard as HTMLElement).getByText("26")).toBeInTheDocument();
    expect(screen.queryByText("Highest band")).not.toBeInTheDocument();
    expect(screen.queryByText("Brinqa Enrichment Probe")).not.toBeInTheDocument();
    expect(screen.queryByText("Run Brinqa enrichment")).not.toBeInTheDocument();
    expect(screen.queryByText("asset-owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Business Unit")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Scanned")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Risk band: All/i })).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "KEV" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Score" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "CVSS" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "EPSS" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Active" })).not.toBeInTheDocument();
    expect(screen.getByText("Fixed")).toHaveClass("bg-slate-100");

    fireEvent.click(screen.getByText("CVE-2024-9999"));
    expect(onOpenFinding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "finding-2" }),
      expect.objectContaining({
        mode: "asset",
        assetId: "asset-10",
        assetLabel: "identity-verify-01",
      })
    );
  });

  it("passes analytics filters without requesting live enrichment", () => {
    seedFindingsHook();
    seedAssetHooks();

    render(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        assetId="asset-10"
        refreshToken={4}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    expect(mockedUseAssetFindingsAnalytics).toHaveBeenCalledWith("asset-10", {
      bandFilter: "All",
      kevOnly: false,
      source: null,
      search: null,
      refreshToken: 4,
    });
  });

  it("shows table rows in server-provided order", () => {
    mockedUseAssetDetail.mockReturnValue({
      assetDetail: null,
      loading: false,
      error: null,
    });
    mockedUseAssetFindingsAnalytics.mockReturnValue({
      analytics: {
        asset: {
          asset_id: "asset-11",
          hostname: "asset-11-host",
        },
        analytics: {
          total_findings: 2,
          kev_findings: 0,
          critical_high_findings: 1,
          highest_risk_band: "Critical",
          average_risk_score: 5.5,
          max_risk_score: 9.9,
          oldest_priority_age_days: null,
          risk_bands: { Critical: 1, High: 0, Medium: 0, Low: 1 },
        },
      },
      loading: false,
      error: null,
    });
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
            asset_id: "asset-11",
            display_name: "Zulu Finding",
            risk_band: "Low",
            risk_score: 1.1,
            source: "Qualys",
          },
          {
            id: "finding-a",
            asset_id: "asset-11",
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
    const rows = within(table).getAllByRole("button", { name: /^Open /i });
    expect(rows[0]).toHaveAccessibleName("Open Zulu Finding");
    expect(rows[1]).toHaveAccessibleName("Open Alpha Finding");
  });
});

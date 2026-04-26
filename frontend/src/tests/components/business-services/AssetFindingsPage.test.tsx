import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssetFindingsPage } from "../../../components/business-services/AssetFindingsPage";
import { useAssetDetail } from "../../../hooks/topology/useAssetDetail";
import { useAssetEnrichment } from "../../../hooks/topology/useAssetEnrichment";
import { useAssetFindings } from "../../../hooks/topology/useAssetFindings";
import { useAssetFindingsAnalytics } from "../../../hooks/topology/useAssetFindingsAnalytics";

vi.mock("../../../hooks/topology/useAssetFindings", () => ({
  useAssetFindings: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetDetail", () => ({
  useAssetDetail: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetEnrichment", () => ({
  useAssetEnrichment: vi.fn(),
}));
vi.mock("../../../hooks/topology/useAssetFindingsAnalytics", () => ({
  useAssetFindingsAnalytics: vi.fn(),
}));

const mockedUseAssetFindings = vi.mocked(useAssetFindings);
const mockedUseAssetDetail = vi.mocked(useAssetDetail);
const mockedUseAssetEnrichment = vi.mocked(useAssetEnrichment);
const mockedUseAssetFindingsAnalytics = vi.mocked(useAssetFindingsAnalytics);

function seedAssetHooks({
  enrichmentStatus = "success",
  enrichmentLoading = false,
  enrichmentError = null,
}: {
  enrichmentStatus?: "success" | "partial_success" | "missing_token" | "unauthorized_token";
  enrichmentLoading?: boolean;
  enrichmentError?: string | null;
} = {}) {
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
      owner: null,
      service_team: null,
      device_type: null,
      category: null,
      internal_or_external: null,
      last_scanned: null,
      last_authenticated_scan: null,
      detail_source: null,
      detail_fetched_at: null,
    },
    loading: false,
    error: null,
  });
  mockedUseAssetEnrichment.mockReturnValue({
    enrichment: {
      asset_id: "asset-10",
      status: enrichmentStatus,
      reason:
        enrichmentStatus === "missing_token"
          ? "missing_auth_token"
          : enrichmentStatus === "unauthorized_token"
            ? "brinqa_unauthorized"
            : enrichmentStatus === "partial_success"
              ? "qualys_source_missing"
              : "both_sources_succeeded",
      owner: enrichmentStatus === "missing_token" ? null : "asset-owner",
      service_team: enrichmentStatus === "missing_token" ? null : "blue-team",
      device_type: enrichmentStatus === "missing_token" ? null : "Server",
      category: enrichmentStatus === "missing_token" ? null : "Compute",
      internal_or_external: enrichmentStatus === "missing_token" ? null : "Internal",
      last_scanned: enrichmentStatus === "missing_token" ? null : "2025-02-20T10:00:00Z",
      last_authenticated_scan:
        enrichmentStatus === "missing_token" ? null : "2025-02-21T11:00:00Z",
      detail_source: enrichmentStatus === "partial_success" ? "servicenow" : "qualys+servicenow",
      detail_fetched_at: "2025-02-21T11:05:00Z",
    },
    loading: enrichmentLoading,
    error: enrichmentError,
    run: vi.fn(),
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
      },
      total: 2,
      page: 1,
      page_size: 10,
      items: [
        {
          id: "finding-1",
          display_name: "TLS Weak Cipher",
          cve_id: "CVE-2024-1111",
          risk_band: "High",
          risk_score: 8.1,
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

    expect(screen.getByText("Asset overview")).toBeInTheDocument();
    expect(screen.getByText("Risk distribution")).toBeInTheDocument();
    expect(screen.getByText("Priority spotlight")).toBeInTheDocument();
    expect(screen.getByText("Enrichment loaded")).toBeInTheDocument();
    expect(screen.getByText("Avg display risk")).toBeInTheDocument();
    expect(screen.getByText("8.6")).toBeInTheDocument();
    expect(screen.getByText("KEV findings")).toBeInTheDocument();
    expect(screen.getByText("44d")).toBeInTheDocument();
    expect(screen.queryByText("Brinqa Enrichment Probe")).not.toBeInTheDocument();
    expect(screen.queryByText("Run Brinqa enrichment")).not.toBeInTheDocument();
    expect(screen.getByText("asset-owner")).toBeInTheDocument();

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

  it("passes the auto-load option to the enrichment hook", () => {
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

    expect(mockedUseAssetEnrichment).toHaveBeenCalledWith("asset-10", 4, {
      loadOnMount: true,
    });
    expect(mockedUseAssetFindingsAnalytics).toHaveBeenCalledWith("asset-10", {
      bandFilter: "All",
      kevOnly: false,
      source: null,
      search: null,
      refreshToken: 4,
    });
  });

  it("shows a compact missing-token enrichment state without blocking the page", () => {
    seedFindingsHook();
    seedAssetHooks({ enrichmentStatus: "missing_token" });

    render(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        assetId="asset-10"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    expect(screen.getByText("Missing Brinqa token")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Asset overview")).toBeInTheDocument();
  });

  it("shows partial or unauthorized enrichment states without hiding findings", () => {
    seedFindingsHook();
    seedAssetHooks({ enrichmentStatus: "partial_success" });

    const { rerender } = render(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        assetId="asset-10"
        refreshToken={0}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    expect(screen.getByText("Partial enrichment")).toBeInTheDocument();
    expect(screen.getByText("Remote Code Execution")).toBeInTheDocument();

    seedFindingsHook();
    seedAssetHooks({ enrichmentStatus: "unauthorized_token" });
    rerender(
      <AssetFindingsPage
        businessUnitSlug="online-store"
        businessServiceSlug="digital-storefront"
        assetId="asset-10"
        refreshToken={1}
        onBack={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenBusinessUnit={vi.fn()}
        onOpenBusinessService={vi.fn()}
        onOpenFinding={vi.fn()}
      />
    );

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows table rows in server-provided order", () => {
    mockedUseAssetDetail.mockReturnValue({
      assetDetail: null,
      loading: false,
      error: null,
    });
    mockedUseAssetEnrichment.mockReturnValue({
      enrichment: null,
      loading: true,
      error: null,
      run: vi.fn(),
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

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FindingDetailPage } from "../../../components/dashboard/FindingDetailPage";
import { useFindingDetails } from "../../../hooks/findings/useFindingDetails";

vi.mock("../../../hooks/findings/useFindingDetails", () => ({
  useFindingDetails: vi.fn(),
}));

const mockedUseFindingDetails = vi.mocked(useFindingDetails);

describe("FindingDetailPage", () => {
  it("renders the read-only investigation layout and hides remediation controls", () => {
    mockedUseFindingDetails.mockReturnValue({
      finding: {
        id: "finding-42",
        source: "Qualys",
        display_name: "OpenSSL Vulnerability",
        risk_score: 8.7,
        risk_band: "High",
        source_risk_score: 7.4,
        source_risk_rating: "High",
        cvss_score: 8.1,
        cvss_severity: "High",
        epss_score: 0.8732,
        epss_percentile: 0.9912,
        status: "Open",
        lifecycle_status: "Active",
        age_in_days: 29,
        cve_id: "CVE-2025-0001",
        cwe_ids: "CWE-79",
        type_display_name: "Remote Code Execution",
        description: "Primary finding description.",
        cveDescription: "Separate CVE description.",
        record_id: "SRC-77",
        uid: "uid-123",
        record_link: "https://example.com/finding/42",
        score_source: "CRQ v4",
        crq_score_version: "v4",
        crq_scored_at: "2026-04-20T10:30:00Z",
        crq_notes: "Score elevated due to exploitable attack path.",
        isKev: false,
        target_count: 1,
        target_names: "api-gateway-01",
      },
      setFinding: vi.fn(),
      loading: false,
      error: null,
    });

    render(
      <FindingDetailPage
        findingId="finding-42"
        refreshToken={0}
        origin={{ mode: "global" }}
        breadcrumbs={[
          { label: "Findings", onClick: vi.fn() },
          { label: "Finding" },
        ]}
        backLabel="Back to Findings"
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("What This Is")).toBeInTheDocument();
    expect(screen.getByText("Affected Asset / Scope")).toBeInTheDocument();
    expect(screen.getByText("Identifiers & Source")).toBeInTheDocument();
    expect(screen.getByText("Scoring Details")).toBeInTheDocument();
    expect(screen.queryByText("Threat Context")).not.toBeInTheDocument();
    expect(screen.queryByText("Save Disposition")).not.toBeInTheDocument();
    expect(screen.queryByText("Remediation / Triage")).not.toBeInTheDocument();
    expect(screen.getByText("Internal finding row ID")).toBeInTheDocument();
    expect(screen.getByText("Source finding ID")).toBeInTheDocument();
    expect(screen.getAllByText("CVE").length).toBeGreaterThan(0);
  });

  it("shows KEV details and asset breadcrumb context when the finding is KEV", () => {
    mockedUseFindingDetails.mockReturnValue({
      finding: {
        id: "finding-88",
        source: "Qualys",
        display_name: "Critical Edge Vulnerability",
        risk_score: 9.9,
        risk_band: "Critical",
        source_risk_score: 9.4,
        cvss_score: 9.8,
        epss_score: 0.9981,
        status: "Open",
        lifecycle_status: "Active",
        cve_id: "CVE-2026-9999",
        description: "Edge service exposure.",
        isKev: true,
        kevDueDate: "2026-05-01",
        kevRansomwareUse: "Known",
        kevRequiredAction: "Patch immediately.",
        kevShortDescription: "Actively exploited edge-service issue.",
        record_id: "SRC-88",
        uid: "uid-888",
      },
      setFinding: vi.fn(),
      loading: false,
      error: null,
    });

    render(
      <FindingDetailPage
        findingId="finding-88"
        refreshToken={0}
        origin={{
          mode: "asset",
          businessUnitSlug: "online-store",
          businessUnitLabel: "Online Store",
          businessServiceSlug: "digital-storefront",
          businessServiceLabel: "Digital Storefront",
          applicationSlug: "identity-verify",
          applicationLabel: "Identity Verify",
          assetId: "asset-10",
          assetLabel: "identity-verify-01",
        }}
        breadcrumbs={[
          { label: "Business Units", onClick: vi.fn() },
          { label: "Online Store", onClick: vi.fn() },
          { label: "Digital Storefront", onClick: vi.fn() },
          { label: "Identity Verify", onClick: vi.fn() },
          { label: "identity-verify-01", onClick: vi.fn() },
          { label: "Finding" },
        ]}
        backLabel="Back to Asset Findings"
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Threat Context")).toBeInTheDocument();
    expect(screen.getByText("Required action")).toBeInTheDocument();
    expect(screen.getByText("Patch immediately.")).toBeInTheDocument();
    expect(screen.getByText("Business-service context")).toBeInTheDocument();
    expect(screen.getByText("Online Store / Digital Storefront / Identity Verify")).toBeInTheDocument();
    expect(screen.getAllByText("identity-verify-01").length).toBeGreaterThan(0);
  });
});

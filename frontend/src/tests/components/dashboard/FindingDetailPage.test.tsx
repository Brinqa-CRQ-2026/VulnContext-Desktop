import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FindingDetailPage } from "../../../components/dashboard/FindingDetailPage";
import { useFindingDetails } from "../../../hooks/findings/useFindingDetails";

vi.mock("../../../hooks/findings/useFindingDetails", () => ({
  useFindingDetails: vi.fn(),
}));

const mockedUseFindingDetails = vi.mocked(useFindingDetails);

describe("FindingDetailPage", () => {
  it("renders the denser finding detail layout with compact supporting details", () => {
    mockedUseFindingDetails.mockReturnValue({
      finding: {
        id: "finding-42",
        source: "Qualys",
        asset_id: "asset-42",
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
        description: "Primary finding description.",
        cveDescription: "Separate CVE description.",
        record_id: "SRC-77",
        uid: "uid-123",
        record_link: "https://example.com/finding/42",
        due_date: "2026-05-12",
        severity: "Critical",
        attack_vector: "Network",
        attack_complexity: "Low",
        score_source: "CRQ v4",
        crq_score_version: "v4",
        crq_scored_at: "2026-04-20T10:30:00Z",
        crq_notes: "Score elevated due to exploitable attack path.",
        isKev: false,
        target_ids: "asset-42",
        target_names: "api-gateway-01",
        remediation_status: "Planned",
        remediation_owner_name: "Blue Team",
        attack_pattern_names: "Exploit Public-Facing Application",
        attack_technique_names: "T1190",
        attack_tactic_names: "Initial Access",
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

    expect(screen.getAllByText("Finding").length).toBeGreaterThan(0);
    expect(screen.getByText("OpenSSL Vulnerability")).toBeInTheDocument();
    expect(screen.getByText("Source: Qualys")).toBeInTheDocument();
    expect(screen.getByText("High / 8.7")).toBeInTheDocument();
    expect(screen.getByText("CVE: CVE-2025-0001")).toBeInTheDocument();
    expect(screen.getByText("Status: Open / Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Findings/i })).toBeInTheDocument();
    expect(screen.getByText("Display Risk")).toBeInTheDocument();
    expect(screen.getByText("Vendor Risk")).toBeInTheDocument();
    expect(screen.getByText("CVSS")).toBeInTheDocument();
    expect(screen.getByText("EPSS")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Percentile 0.9912")).toBeInTheDocument();
    expect(screen.getByText("Action Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Finding Overview")).toBeInTheDocument();
    expect(screen.getByText("Remediation")).toBeInTheDocument();
    expect(screen.getByText("Affected Asset & Business Context")).toBeInTheDocument();
    expect(screen.getByText("Supporting Details")).toBeInTheDocument();
    expect(screen.queryByText("KEV Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Recommendation")).not.toBeInTheDocument();
    expect(screen.queryByText("Short Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Patch the affected OpenSSL package.")).not.toBeInTheDocument();
    expect(screen.getByText("Primary Description")).toBeInTheDocument();
    expect(screen.getByText("Separate CVE description.")).toBeInTheDocument();
    expect(screen.getByText("Identifiers")).toBeInTheDocument();
    expect(screen.getByText("Internal finding row ID")).toBeInTheDocument();
    expect(screen.queryByText("Source finding ID")).not.toBeInTheDocument();
    expect(screen.getByText("Scoring")).toBeInTheDocument();
  });

  it("shows KEV details only for KEV findings and keeps them near the top", () => {
    mockedUseFindingDetails.mockReturnValue({
      finding: {
        id: "finding-88",
        source: "Qualys",
        asset_id: "asset-88",
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
        kevDateAdded: "2026-04-20",
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

    expect(screen.getByText("Known Exploited Vulnerability")).toBeInTheDocument();
    expect(screen.getAllByText("Patch immediately.").length).toBeGreaterThan(0);
    expect(screen.getByText("KEV Details")).toBeInTheDocument();
    expect(screen.getByText("KEV date added")).toBeInTheDocument();
    expect(screen.getByText("Business context")).toBeInTheDocument();
    expect(screen.getByText("Online Store / Digital Storefront / Identity Verify")).toBeInTheDocument();
    expect(screen.getAllByText("identity-verify-01").length).toBeGreaterThan(0);
  });

  it("does not show large empty remediation callouts when no remediation narrative exists", () => {
    mockedUseFindingDetails.mockReturnValue({
      finding: {
        id: "finding-12",
        source: "Brinqa",
        asset_id: "asset-12",
        risk_score: 6.2,
        risk_band: "Medium",
      },
      setFinding: vi.fn(),
      loading: false,
      error: null,
    });

    render(
      <FindingDetailPage
        findingId="finding-12"
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

    expect(screen.queryByText("Action Snapshot")).not.toBeInTheDocument();
    expect(screen.getByText("Finding Overview")).toBeInTheDocument();
    expect(screen.getByText("Remediation")).toBeInTheDocument();
    expect(screen.queryByText("Recommendation text is not yet available from the backend detail route.")).not.toBeInTheDocument();
    expect(screen.queryByText("KEV Details")).not.toBeInTheDocument();
  });
});

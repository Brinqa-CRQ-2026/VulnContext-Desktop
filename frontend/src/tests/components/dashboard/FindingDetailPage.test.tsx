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
        nvd_vuln_status: "ANALYZED",
        nvd_published: "2022-01-11T12:00:00Z",
        nvd_last_modified: "2025-04-15T12:00:00Z",
        kevDateAdded: "2022-07-20T00:00:00Z",
        kevDueDate: "2022-08-10T00:00:00Z",
        kevVulnerabilityName: "Atlassian Questions For Confluence Hardcoded Credentials Vulnerability",
        record_id: "SRC-77",
        uid: "uid-123",
        record_link: "https://example.com/finding/42",
        due_date: "2026-05-12",
        severity: "Critical",
        cvss_version: "3.1",
        cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H",
        attack_vector: "Network",
        attack_complexity: "Low",
        privileges_required: "NONE",
        user_interaction: "REQUIRED",
        scope: "CHANGED",
        confidentiality_impact: "HIGH",
        integrity_impact: "HIGH",
        availability_impact: "HIGH",
        primary_cwe_id: "CWE-416",
        primary_cwe_description: "Use After Free",
        references: [
          {
            url: "https://example.com/vendor-advisory",
            source: "Example Vendor",
            tags: ["Vendor Advisory"],
            group: "Vendor Advisory",
          },
        ],
        reference_groups: {
          "Patch / Release Notes": [
            {
              url: "https://example.com/release-notes",
              source: "Example Project",
              tags: ["Patch", "Release Notes"],
              group: "Patch / Release Notes",
            },
          ],
          "Vendor Advisory": [
            {
              url: "https://example.com/vendor-advisory",
              source: "Example Vendor",
              tags: ["Vendor Advisory"],
              group: "Vendor Advisory",
            },
          ],
        },
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
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("KEV")).not.toBeInTheDocument();
    expect(screen.queryByText("Source: Qualys")).not.toBeInTheDocument();
    expect(screen.queryByText("High / 8.7")).not.toBeInTheDocument();
    expect(screen.queryByText("CVE: CVE-2025-0001")).not.toBeInTheDocument();
    expect(screen.queryByText("Status: Open / Active")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Back to Findings/i })).not.toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
    expect(screen.getByLabelText("About risk score")).toBeInTheDocument();
    expect(screen.queryByText("Display Risk")).not.toBeInTheDocument();
    expect(screen.queryByText("Vendor Risk")).not.toBeInTheDocument();
    expect(screen.getByText("CVSS")).toBeInTheDocument();
    expect(screen.getByText("EPSS")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Percentile 0.9912")).toBeInTheDocument();
    expect(screen.getByText("Finding Overview")).toBeInTheDocument();
    expect(screen.getByText("Supporting Details")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Asset & Business Context" })).toBeInTheDocument();
    expect(screen.queryByText("KEV Details")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open remediation reference" })).toHaveAttribute(
      "href",
      "https://example.com/release-notes"
    );
    expect(screen.queryByText("Short Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Patch the affected OpenSSL package.")).not.toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Separate CVE description.")).toBeInTheDocument();
    expect(screen.getByText("CVE Intelligence")).toBeInTheDocument();
    expect(screen.getByText("CISA Known Exploited Vulnerability")).toBeInTheDocument();
    expect(screen.getByText("NVD Status")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Added to KEV")).toBeInTheDocument();
    expect(screen.getByText("Action Due")).toBeInTheDocument();
    expect(screen.getByText("Analyzed")).toBeInTheDocument();
    expect(screen.getByText("Atlassian Questions For Confluence Hardcoded Credentials Vulnerability")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Last Modified")).toBeInTheDocument();
    expect(screen.getByText("CVSS Version")).toBeInTheDocument();
    expect(screen.getByText("3.1")).toBeInTheDocument();
    expect(screen.queryByText("CVSS Vector")).not.toBeInTheDocument();
    expect(screen.queryByText("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:H")).not.toBeInTheDocument();
    expect(screen.queryByText("Primary Description")).not.toBeInTheDocument();
    expect(screen.queryByText("CVE Description")).not.toBeInTheDocument();
    expect(screen.getByText("Vulnerability Type")).toBeInTheDocument();
    expect(screen.getByText("CWE-416")).toBeInTheDocument();
    expect(screen.getByText("Use After Free")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Attack Vector" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Attack Complexity" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Privileges Required" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "User Interaction" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Confidentiality Impact" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Integrity Impact" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Availability Impact" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Scope" })).toBeInTheDocument();
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getByText("Changed")).toBeInTheDocument();
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

    expect(screen.getAllByText("Patch immediately.").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Asset & Business Context" })).toBeInTheDocument();
    expect(screen.getAllByText("identity-verify-01").length).toBeGreaterThan(0);
    expect(screen.getByText("KEV")).toBeInTheDocument();
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

    expect(screen.getByText("Finding Overview")).toBeInTheDocument();
    expect(screen.getByText("Supporting Details")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Asset & Business Context" })).toBeInTheDocument();
  });
});

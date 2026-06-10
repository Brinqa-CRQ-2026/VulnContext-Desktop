import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FindingOverviewSection,
  FindingSupportingDetailsSection,
} from "../../../components/dashboard/FindingDetailSections";
import { buildFinding } from "../../fixtures/findings/findings";
import { openExternalUrl } from "../../../lib/externalUrls";

vi.mock("../../../lib/externalUrls", () => ({
  openExternalUrl: vi.fn(),
}));

const mockedOpenExternalUrl = vi.mocked(openExternalUrl);

describe("FindingDetailSections", () => {
  it("renders fallback copy when optional CVE, CVSS, CWE, and reference fields are missing", () => {
    render(
      <FindingOverviewSection
        finding={buildFinding({
          cveDescription: null,
          description: null,
          summary: null,
          nvd_vuln_status: null,
          nvd_published: null,
          nvd_last_modified: null,
          cvss_version: null,
          primary_cwe_id: null,
          primary_cwe_description: null,
          attack_vector: null,
          attack_complexity: null,
          privileges_required: null,
          user_interaction: null,
          confidentiality_impact: null,
          integrity_impact: null,
          availability_impact: null,
          scope: null,
          references: [],
          reference_groups: {},
        })}
        recommendationText={null}
      />
    );

    expect(screen.getByText("No CVE description is available for this finding.")).toBeInTheDocument();
    expect(screen.getByText("No recommendation is available for this finding.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open remediation reference" })).not.toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(4);
  });

  it("opens remediation references through the runtime wrapper boundary", async () => {
    const user = userEvent.setup();
    mockedOpenExternalUrl.mockResolvedValue(true);

    render(
      <FindingOverviewSection
        finding={buildFinding({
          reference_groups: {
            "Patch / Release Notes": [
              {
                url: "https://vendor.example.com/release",
                source: "Vendor",
                tags: ["Patch"],
                group: "Patch / Release Notes",
              },
            ],
          },
        })}
        recommendationText="Patch the vulnerable package."
      />
    );

    await user.click(screen.getByRole("link", { name: "Open remediation reference" }));

    expect(mockedOpenExternalUrl).toHaveBeenCalledWith("https://vendor.example.com/release");
  });

  it("renders supporting details with attack tabs only when attack context exists", () => {
    const { rerender } = render(
      <FindingSupportingDetailsSection
        finding={buildFinding({
          id: "finding-1",
          cve_id: null,
          uid: "source-1",
          record_link: "https://scanner.example.com/finding-1",
          attack_pattern_names: null,
          attack_technique_names: null,
          attack_tactic_names: null,
        })}
        hasAttackContext={false}
        origin={{ mode: "global" }}
        assetLabel="-"
        businessContext=""
      />
    );

    expect(screen.getByText("Internal finding row ID")).toBeInTheDocument();
    expect(screen.getByText("Source UID")).toBeInTheDocument();
    expect(screen.getByText("Record link")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Attack" })).not.toBeInTheDocument();

    rerender(
      <FindingSupportingDetailsSection
        finding={buildFinding({ attack_pattern_names: "Exploit Public-Facing Application" })}
        hasAttackContext
        origin={{ mode: "global" }}
        assetLabel="api-1"
        businessContext="Online Store / Checkout"
      />
    );

    expect(screen.getByRole("tab", { name: "Attack" })).toBeInTheDocument();
  });
});

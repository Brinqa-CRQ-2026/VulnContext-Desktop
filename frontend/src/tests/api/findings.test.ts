import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadFindingsApi() {
  vi.resetModules();
  return import("../../api/findings");
}

describe("api/findings", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  it("calls GET /findings/top", async () => {
    const { getTopScores } = await loadFindingsApi();
    await getTopScores();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/top");
  });

  it("calls GET /findings/summary", async () => {
    const { getScoresSummary } = await loadFindingsApi();
    await getScoresSummary();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/summary");
  });

  it("sends paging, sort, and source params for getAllFindings", async () => {
    const { getAllFindings } = await loadFindingsApi();
    await getAllFindings(2, 25, "cvss_score", "asc", "  Qualys  ");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=2&page_size=25&sort_by=cvss_score&sort_order=asc&source=Qualys"
    );
  });

  it("omits source when it is empty for getAllFindings", async () => {
    const { getAllFindings } = await loadFindingsApi();
    await getAllFindings(1, 20, "risk_score", "desc", "   ");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=1&page_size=20&sort_by=risk_score&sort_order=desc"
    );
  });

  it("includes the risk band and optional source for filtered findings", async () => {
    const { getFindingsByRiskBand } = await loadFindingsApi();
    await getFindingsByRiskBand("High", 3, 10, "age_in_days", "asc", "Nessus");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=3&page_size=10&sort_by=age_in_days&sort_order=asc&risk_band=High&source=Nessus"
    );
  });

  it("calls GET /findings/{id}", async () => {
    const { getFindingById } = await loadFindingsApi();
    await getFindingById("finding-42");
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/finding-42");
  });

  it("preserves enriched finding detail contract fields", async () => {
    const enrichedFinding = {
      id: "finding-42",
      source: "Brinqa",
      asset_id: "asset-42",
      cve_id: "CVE-2026-12345",
      cveDescription: "NVD technical context.",
      nvd_vuln_status: "Analyzed",
      nvd_published: "2026-01-02T03:04:05Z",
      nvd_last_modified: "2026-02-03T04:05:06Z",
      cvss_score: 9.8,
      cvss_version: "3.1",
      cvss_severity: "CRITICAL",
      cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      cvss_exploitability_score: 3.9,
      cvss_impact_score: 5.9,
      attack_vector: "NETWORK",
      attack_complexity: "LOW",
      privileges_required: "NONE",
      user_interaction: "NONE",
      scope: "UNCHANGED",
      confidentiality_impact: "HIGH",
      integrity_impact: "HIGH",
      availability_impact: "HIGH",
      isKev: true,
      kevDateAdded: "2026-03-01T00:00:00Z",
      kevDueDate: "2026-03-22T00:00:00Z",
      kevVendorProject: "Example Vendor",
      kevProduct: "Widget",
      kevVulnerabilityName: "Example Widget Vulnerability",
      kevShortDescription: "Example KEV context.",
      primary_cwe_id: "CWE-502",
      primary_cwe_description: "CWE-502",
      weaknesses: [{ cwe_id: "CWE-502", description: "CWE-502", primary: true }],
      affected_products: [
        {
          criteria: "cpe:2.3:a:example:widget:1.0:*:*:*:*:*:*:*",
          vendor: "example",
          product: "widget",
          version: "1.0",
        },
      ],
      references: [
        {
          url: "https://vendor.example/advisory",
          source: "Example Vendor",
          tags: ["Vendor Advisory"],
          group: "Vendor Advisory",
        },
      ],
      reference_groups: {
        "Vendor Advisory": [
          {
            url: "https://vendor.example/advisory",
            source: "Example Vendor",
            tags: ["Vendor Advisory"],
            group: "Vendor Advisory",
          },
        ],
      },
    };
    getFetchMock().mockResolvedValueOnce(new Response(JSON.stringify(enrichedFinding)));

    const { getFindingById } = await loadFindingsApi();
    const finding = await getFindingById("finding-42");

    expect(finding).toEqual(enrichedFinding);
    expect(finding.reference_groups?.["Vendor Advisory"]?.[0]?.url).toBe(
      "https://vendor.example/advisory"
    );
  });

  it("surfaces backend errors", async () => {
    const { getTopScores } = await loadFindingsApi();
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "nope" }), { status: 500 })
    );

    await expect(getTopScores()).rejects.toThrow("nope");
  });
});

import { describe, expectTypeOf, it } from "vitest";

import type {
  FindingsSortBy,
  NvdAffectedProduct,
  NvdReference,
  NvdReferenceGroups,
  NvdWeakness,
  RiskBandFilter,
  ScoredFinding,
  SourceSummary,
} from "../../types";

describe("types", () => {
  it("exposes the expected string unions and source summary shape", () => {
    expectTypeOf<RiskBandFilter>().toEqualTypeOf<
      "All" | "Critical" | "High" | "Medium" | "Low"
    >();

    expectTypeOf<FindingsSortBy>().toEqualTypeOf<
      | "risk_score"
      | "internal_risk_score"
      | "source_risk_score"
      | "cvss_score"
      | "epss_score"
      | "age_in_days"
      | "due_date"
      | "source"
    >();

    expectTypeOf<SourceSummary>().toMatchTypeOf<{
      source: string;
      total_findings: number;
      risk_bands: {
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
      };
    }>();
  });

  it("exposes the enriched finding detail contract", () => {
    expectTypeOf<NvdWeakness>().toMatchTypeOf<{
      cwe_id?: string | null;
      description?: string | null;
      primary?: boolean | null;
    }>();

    expectTypeOf<NvdAffectedProduct>().toMatchTypeOf<{
      criteria?: string | null;
      vendor?: string | null;
      product?: string | null;
      version?: string | null;
    }>();

    expectTypeOf<NvdReference>().toMatchTypeOf<{
      url: string;
      source?: string | null;
      tags?: string[] | null;
      group?: string | null;
    }>();

    expectTypeOf<NvdReferenceGroups>().toMatchTypeOf<Record<string, NvdReference[]>>();

    expectTypeOf<ScoredFinding>().toMatchTypeOf<{
      nvd_vuln_status?: string | null;
      nvd_published?: string | null;
      nvd_last_modified?: string | null;
      cisa_exploit_add?: string | null;
      cisa_action_due?: string | null;
      cisa_required_action?: string | null;
      cisa_vulnerability_name?: string | null;
      cvss_exploitability_score?: number | null;
      cvss_impact_score?: number | null;
      privileges_required?: string | null;
      user_interaction?: string | null;
      scope?: string | null;
      confidentiality_impact?: string | null;
      integrity_impact?: string | null;
      availability_impact?: string | null;
      primary_cwe_id?: string | null;
      primary_cwe_description?: string | null;
      weaknesses?: NvdWeakness[] | null;
      affected_products?: NvdAffectedProduct[] | null;
      references?: NvdReference[] | null;
      reference_groups?: NvdReferenceGroups | null;
    }>();
  });
});

import { describe, expectTypeOf, it } from "vitest";

import type {
  FindingsSortBy,
  RiskBandFilter,
  SourceSummary,
} from "../../api/types";

describe("api/types", () => {
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
});

import { describe, expectTypeOf, it } from "vitest";

import type {
  FindingDisposition,
  FindingsSortBy,
  RiskBandFilter,
  RiskWeightsConfig,
} from "../../api/types";

describe("api/types", () => {
  it("exposes the expected string unions and weight keys", () => {
    expectTypeOf<FindingDisposition>().toEqualTypeOf<
      "none" | "ignored" | "risk_accepted" | "false_positive" | "not_applicable"
    >();

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

    expectTypeOf<RiskWeightsConfig>().toMatchTypeOf<{
      cvss_weight: number;
      epss_weight: number;
      kev_weight: number;
      asset_criticality_weight: number;
      context_weight: number;
    }>();
  });
});

import { describe, expect, it } from "vitest";

import * as api from "../../api";

describe("api/index", () => {
  it("re-exports the public API surface", () => {
    expect(api.getTopScores).toBeTypeOf("function");
    expect(api.getSourcesSummary).toBeTypeOf("function");
    expect(api.getRiskWeights).toBeTypeOf("function");
    expect(api.seedQualysCsv).toBeTypeOf("function");
  });

  it("re-exports shared types through the module boundary", () => {
    expect(api).toHaveProperty("getFindingById");
    expect(api).toHaveProperty("renameSource");
  });
});

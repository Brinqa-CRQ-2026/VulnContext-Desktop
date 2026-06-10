import { describe, expect, it } from "vitest";

import { formatNullableNumber, formatNumber } from "../../../lib/formatting/numbers";

describe("number formatting helpers", () => {
  it("formats numbers with the requested precision", () => {
    expect(formatNumber(7.349, 1)).toBe("7.3");
    expect(formatNumber(7.349, 2)).toBe("7.35");
    expect(formatNumber(0, 0)).toBe("0");
    expect(formatNumber(-1.25, 1)).toBe("-1.3");
  });

  it("returns fallback text for nullish and NaN values", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(undefined, 1, "n/a")).toBe("n/a");
    expect(formatNumber(Number.NaN, 1, "missing")).toBe("missing");
    expect(formatNullableNumber(null, 2, "empty")).toBe("empty");
  });
});

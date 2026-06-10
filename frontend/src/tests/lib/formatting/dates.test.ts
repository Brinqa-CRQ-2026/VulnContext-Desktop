import { describe, expect, it } from "vitest";

import { formatAgeDays, formatDate } from "../../../lib/formatting/dates";

describe("date formatting helpers", () => {
  it("uses fallback for missing ages and rounds day counts", () => {
    expect(formatAgeDays(null)).toBe("-");
    expect(formatAgeDays(undefined, "n/a")).toBe("n/a");
    expect(formatAgeDays(Number.NaN, "n/a")).toBe("n/a");
    expect(formatAgeDays(0)).toBe("0d");
    expect(formatAgeDays(12.6)).toBe("13d");
  });

  it("formats valid dates and preserves invalid source text", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined, true)).toBe("-");
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("2026-01-02T03:04:05Z")).not.toBe("2026-01-02T03:04:05Z");
  });
});

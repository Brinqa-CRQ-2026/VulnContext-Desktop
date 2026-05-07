import { describe, expect, it } from "vitest";

import { formatAgeDays, formatDate } from "../../lib/formatting/dates";
import { formatNumber } from "../../lib/formatting/numbers";
import { isPopulatedText, joinDisplayText } from "../../lib/formatting/text";

describe("formatting utilities", () => {
  it("formats numbers with configurable fallback text", () => {
    expect(formatNumber(7.349, 1)).toBe("7.3");
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(undefined, 1, "—")).toBe("—");
    expect(formatNumber(Number.NaN, 1, "n/a")).toBe("n/a");
  });

  it("formats dates and keeps invalid date strings visible", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("formats ages in days", () => {
    expect(formatAgeDays(12.4)).toBe("12d");
    expect(formatAgeDays(undefined)).toBe("-");
    expect(formatAgeDays(Number.NaN, "—")).toBe("—");
  });

  it("joins populated display text with fallback", () => {
    expect(isPopulatedText(" value ")).toBe(true);
    expect(isPopulatedText(" ")).toBe(false);
    expect(joinDisplayText(["A", null, "B"])).toBe("A / B");
    expect(joinDisplayText([null, " "], "fallback")).toBe("fallback");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildInitials,
  formatText,
  isPopulatedText,
  joinDisplayText,
} from "../../../lib/formatting/text";

describe("text formatting helpers", () => {
  it("detects populated text after trimming whitespace", () => {
    expect(isPopulatedText(" value ")).toBe(true);
    expect(isPopulatedText("")).toBe(false);
    expect(isPopulatedText("   ")).toBe(false);
    expect(isPopulatedText(null)).toBe(false);
  });

  it("formats and joins display text with fallbacks", () => {
    expect(formatText("  ", "fallback")).toBe("fallback");
    expect(formatText("value")).toBe("value");
    expect(joinDisplayText(["Company", null, " Business Unit "])).toBe(
      "Company /  Business Unit "
    );
    expect(joinDisplayText([undefined, " "], "empty")).toBe("empty");
  });

  it("builds initials from the first two words", () => {
    expect(buildInitials("Digital Storefront")).toBe("DS");
    expect(buildInitials("  online   store platform ")).toBe("OS");
    expect(buildInitials("single")).toBe("S");
    expect(buildInitials("")).toBe("");
  });
});

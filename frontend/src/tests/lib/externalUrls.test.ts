import { describe, expect, it } from "vitest";

import { isExternalUrl } from "../../lib/externalUrls";

describe("isExternalUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isExternalUrl("https://nvd.nist.gov/vuln/detail/CVE-2026-0001")).toBe(true);
    expect(isExternalUrl("http://example.com/advisory")).toBe(true);
  });

  it("rejects internal and non-http URLs", () => {
    expect(isExternalUrl("/findings/123")).toBe(false);
    expect(isExternalUrl("mailto:security@example.com")).toBe(false);
    expect(isExternalUrl("javascript:alert(1)")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { compareSortValues, toggleSort } from "../../../lib/sorting/sortState";

describe("sort state helpers", () => {
  it("toggles order for the same key and resets new keys to ascending", () => {
    expect(toggleSort({ key: "risk", order: "asc" }, "risk")).toEqual({
      key: "risk",
      order: "desc",
    });
    expect(toggleSort({ key: "risk", order: "desc" }, "name")).toEqual({
      key: "name",
      order: "asc",
    });
  });

  it("compares strings case-insensitively and respects order", () => {
    expect(compareSortValues("Alpha", "beta", "asc")).toBeLessThan(0);
    expect(compareSortValues("Alpha", "beta", "desc")).toBeGreaterThan(0);
    expect(compareSortValues(null, "beta", "asc")).toBeLessThan(0);
  });

  it("compares numbers and booleans with nulls sorted last in descending order", () => {
    expect(compareSortValues(10, 2, "asc")).toBeGreaterThan(0);
    expect(compareSortValues(true, false, "asc")).toBeGreaterThan(0);
    expect(compareSortValues(null, 1, "desc")).toBeGreaterThan(0);
  });
});

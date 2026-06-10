import { describe, expect, it } from "vitest";

import { getPaginationWindow } from "../../../lib/pagination/getPaginationWindow";

describe("getPaginationWindow", () => {
  it("returns a centered page window clamped to valid page numbers", () => {
    expect(getPaginationWindow({ page: 5, totalPages: 10, windowSize: 2 })).toEqual([
      3, 4, 5, 6, 7,
    ]);
    expect(getPaginationWindow({ page: 1, totalPages: 10, windowSize: 2 })).toEqual([
      1, 2, 3,
    ]);
    expect(getPaginationWindow({ page: 10, totalPages: 10, windowSize: 2 })).toEqual([
      8, 9, 10,
    ]);
  });
});

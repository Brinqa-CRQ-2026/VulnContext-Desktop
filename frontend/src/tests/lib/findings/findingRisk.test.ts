import { describe, expect, it } from "vitest";

import { riskBandPillClass, riskBandWeight } from "../../../lib/findings/findingRisk";

describe("finding risk helpers", () => {
  it("maps known risk bands to sortable weights case-insensitively", () => {
    expect(riskBandWeight("Critical")).toBe(4);
    expect(riskBandWeight("HIGH")).toBe(3);
    expect(riskBandWeight("medium")).toBe(2);
    expect(riskBandWeight("Low")).toBe(1);
  });

  it("uses neutral values for unknown or missing bands", () => {
    expect(riskBandWeight("Informational")).toBe(0);
    expect(riskBandWeight(null)).toBe(0);
    expect(riskBandPillClass(undefined)).toBe("bg-slate-100 text-slate-700");
  });

  it("returns stable class names for each displayed risk band", () => {
    expect(riskBandPillClass("Critical")).toBe("bg-rose-100 text-rose-700");
    expect(riskBandPillClass("High")).toBe("bg-orange-100 text-orange-700");
    expect(riskBandPillClass("Medium")).toBe("bg-amber-100 text-amber-700");
    expect(riskBandPillClass("Low")).toBe("bg-emerald-100 text-emerald-700");
  });
});

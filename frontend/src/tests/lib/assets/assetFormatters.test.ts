import { describe, expect, it } from "vitest";

import {
  deriveAssetStatus,
  formatCategory,
  formatEnvironment,
  getAssetName,
  getAssetType,
  getComplianceBadges,
} from "../../../lib/assets/assetFormatters";
import { buildAsset } from "../../fixtures/topology/topology";

describe("asset formatter helpers", () => {
  it("prefers hostnames while falling back to asset IDs and placeholder asset types", () => {
    expect(getAssetName(buildAsset({ hostname: "web-1" }))).toBe("web-1");
    expect(getAssetName(buildAsset({ hostname: null, asset_id: "asset-42" }))).toBe("asset-42");
    expect(getAssetType(buildAsset({ device_type: null }))).toBe("—");
    expect(formatCategory(null)).toBe("—");
  });

  it("formats environment and derives active state from source status strings", () => {
    expect(formatEnvironment(" production ")).toBe("Production");
    expect(formatEnvironment("")).toBe("Unknown");
    expect(deriveAssetStatus("open")).toBe("Active");
    expect(deriveAssetStatus("retired")).toBe("Not active");
    expect(deriveAssetStatus(null)).toBe("Not active");
  });

  it("normalizes compliance badges and removes duplicate PCI/PII flags", () => {
    expect(
      getComplianceBadges(
        buildAsset({
          pci: true,
          pii: true,
          compliance_flags: "pci; hipaa | pii, sox",
        })
      )
    ).toEqual(["PCI", "PII", "HIPAA", "SOX"]);
  });
});

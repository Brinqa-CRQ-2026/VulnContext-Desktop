import type { AssetSummary } from "../../types";
import { formatText } from "../formatting/text";

export function getAssetName(asset: AssetSummary) {
  return asset.hostname ?? asset.asset_id;
}

export function getAssetType(asset: AssetSummary) {
  return formatText(asset.device_type, "—");
}

export function formatEnvironment(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatCategory(value?: string | null) {
  return formatText(value, "—");
}

export function deriveAssetStatus(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized && /fixed|closed|resolved|inactive|retired/.test(normalized)) {
    return "Not active";
  }
  if (normalized && /active|open|new/.test(normalized)) {
    return "Active";
  }
  return "Not active";
}

export function getComplianceBadges(asset: AssetSummary) {
  const badges = new Set<string>();
  if (asset.pci) badges.add("PCI");
  if (asset.pii) badges.add("PII");
  const rawFlags = (asset.compliance_flags ?? "")
    .split(/[;,|]/)
    .map((value) => value.trim())
    .filter(Boolean);
  rawFlags.forEach((flag) => {
    const normalized = flag.toUpperCase();
    if (normalized !== "PCI" && normalized !== "PII") {
      badges.add(normalized);
    }
  });
  return Array.from(badges);
}

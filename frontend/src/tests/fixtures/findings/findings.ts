import type { ScoredFinding } from "../../../types";

export function buildFinding(overrides: Partial<ScoredFinding> = {}): ScoredFinding {
  return {
    id: "finding-1",
    source: "scanner",
    asset_id: "asset-1",
    cve_id: "CVE-2026-0001",
    title: "Example vulnerability",
    severity: "High",
    status: "Active",
    risk_score: 8.5,
    risk_band: "High",
    priority_score: 8.7,
    age_in_days: 12,
    asset_name: "asset-1",
    target_names: "asset-1",
    business_service: "Digital Storefront",
    application: "Identity",
    isKev: false,
    ...overrides,
  } as ScoredFinding;
}

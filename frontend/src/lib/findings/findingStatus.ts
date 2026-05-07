import type { ScoredFinding } from "../../types";

export type NormalizedFindingStatus = "Active" | "Inactive" | "Fixed";

export function normalizeFindingStatus(finding: ScoredFinding): NormalizedFindingStatus {
  const combined = [finding.status, finding.lifecycle_status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/fixed|closed|resolved|remediated/.test(combined)) {
    return "Fixed";
  }
  if (/inactive|unactive|retired/.test(combined)) {
    return "Inactive";
  }
  if (/active|open|new/.test(combined)) {
    return "Active";
  }
  return "Active";
}

export function findingStatusTone(
  status: NormalizedFindingStatus
): "low" | "neutral" | "dark" {
  if (status === "Fixed") return "dark";
  if (status === "Active") return "low";
  return "neutral";
}

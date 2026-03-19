import { buildApiUrl, parseJsonOrThrow } from "./client";
import type { RiskWeightsConfig, RiskWeightsUpdateResult } from "./types";

export async function getRiskWeights(): Promise<RiskWeightsConfig> {
  const res = await fetch(buildApiUrl("/risk-weights"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch risk weights: ${res.status} ${res.statusText}`
  );
}

export async function updateRiskWeights(
  weights: RiskWeightsConfig
): Promise<RiskWeightsUpdateResult> {
  const res = await fetch(buildApiUrl("/risk-weights"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(weights),
  });
  return parseJsonOrThrow(
    res,
    `Failed to update risk weights: ${res.status} ${res.statusText}`
  );
}

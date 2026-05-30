import { buildApiUrl, parseJsonOrThrow } from "./client";

export interface MLRiskFeatureSummary {
  finding_id: string;
  prediction_score?: number | null;
}

export async function predictFindingMlRisk(
  findingId: string
): Promise<MLRiskFeatureSummary> {
  const res = await fetch(
    buildApiUrl(`/findings/${encodeURIComponent(findingId)}/ml-risk/predict`),
    { method: "POST" }
  );

  return parseJsonOrThrow(
    res,
    `Failed to predict ML risk: ${res.status} ${res.statusText}`
  );
}
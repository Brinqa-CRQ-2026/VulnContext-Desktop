import { buildApiUrl, parseJsonOrThrow } from "./client";
import type { ControlAssessment } from "./types";

export async function getCurrentControlAssessment(): Promise<ControlAssessment> {
  const res = await fetch(buildApiUrl("/controls/current"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch control assessment: ${res.status} ${res.statusText}`
  );
}

export async function saveCurrentControlAssessment(
  answers: Record<string, Record<string, number>>
): Promise<ControlAssessment> {
  const res = await fetch(buildApiUrl("/controls/current"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      answers,
    }),
  });
  return parseJsonOrThrow(
    res,
    `Failed to save control assessment: ${res.status} ${res.statusText}`
  );
}

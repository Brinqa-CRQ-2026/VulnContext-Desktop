import { buildApiUrl, parseJsonOrThrow } from "./client";
import type { SourceSummary } from "./types";

export async function getSourcesSummary(): Promise<SourceSummary[]> {
  const res = await fetch(buildApiUrl("/sources"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch sources: ${res.status} ${res.statusText}`
  );
}

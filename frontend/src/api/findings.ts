import { buildApiUrl, parseJsonOrThrow } from "./client";
import type {
  FindingsSortBy,
  PaginatedFindings,
  RiskBandFilter,
  ScoresSummary,
  ScoredFinding,
  SortOrder,
} from "./types";

export async function getTopScores(): Promise<ScoredFinding[]> {
  const res = await fetch(buildApiUrl("/findings/top"));
  return parseJsonOrThrow(res, `Failed to fetch scores: ${res.status} ${res.statusText}`);
}

export async function getScoresSummary(): Promise<ScoresSummary> {
  const res = await fetch(buildApiUrl("/findings/summary"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch scores summary: ${res.status} ${res.statusText}`
  );
}

export async function getAllFindings(
  page: number,
  pageSize: number,
  sortBy: FindingsSortBy = "risk_score",
  sortOrder: SortOrder = "desc",
  source?: string | null
): Promise<PaginatedFindings> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (source && source.trim()) {
    params.set("source", source.trim());
  }

  const res = await fetch(buildApiUrl("/findings", params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch findings: ${res.status} ${res.statusText}`
  );
}

export async function getFindingsByRiskBand(
  riskBand: Exclude<RiskBandFilter, "All">,
  page: number,
  pageSize: number,
  sortBy: FindingsSortBy = "risk_score",
  sortOrder: SortOrder = "desc",
  source?: string | null
): Promise<PaginatedFindings> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
    risk_band: riskBand,
  });
  if (source && source.trim()) {
    params.set("source", source.trim());
  }

  const res = await fetch(buildApiUrl("/findings", params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch findings by risk band: ${res.status} ${res.statusText}`
  );
}

export async function getFindingById(findingId: string): Promise<ScoredFinding> {
  const res = await fetch(buildApiUrl(`/findings/${encodeURIComponent(findingId)}`));
  return parseJsonOrThrow(
    res,
    `Failed to fetch finding: ${res.status} ${res.statusText}`
  );
}

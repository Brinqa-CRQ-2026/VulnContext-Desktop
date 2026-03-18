// src/api.ts

export type FindingDisposition =
  | "none"
  | "ignored"
  | "risk_accepted"
  | "false_positive"
  | "not_applicable";

export interface ScoredFinding {
  id: number;
  source: string;

  uid?: string | null;
  record_id?: string | null;
  display_name?: string | null;
  record_link?: string | null;

  status?: string | null;
  status_category?: string | null;
  source_status?: string | null;
  compliance_status?: string | null;
  severity?: string | null;
  lifecycle_status?: string | null;

  age_in_days?: number | null;
  first_found?: string | null;
  last_found?: string | null;
  due_date?: string | null;
  fixed_at?: string | null;
  status_changed_at?: string | null;
  cisa_due_date_expired?: boolean | null;

  target_count?: number | null;
  target_ids?: string | null;
  target_names?: string | null;

  cve_id?: string | null;
  cve_ids?: string | null;
  cve_record_names?: string | null;
  cwe_ids?: string | null;

  cvss_score?: number | null;
  cvss_version?: string | null;
  cvss_severity?: string | null;
  cvss_vector?: string | null;
  attack_vector?: string | null;
  attack_complexity?: string | null;
  epss_score?: number | null;
  epss_percentile?: number | null;

  isKev?: boolean;
  kevDateAdded?: string | null;
  kevDueDate?: string | null;
  kevVendorProject?: string | null;
  kevProduct?: string | null;
  kevVulnerabilityName?: string | null;
  kevShortDescription?: string | null;
  kevRequiredAction?: string | null;
  kevRansomwareUse?: string | null;

  risk_score?: number | null;
  risk_band?: string | null;
  source_risk_score?: number | null;
  source_risk_band?: string | null;
  source_risk_rating?: string | null;
  base_risk_score?: number | null;
  internal_risk_score?: number | null;
  internal_risk_band?: string | null;
  internal_risk_notes?: string | null;

  asset_criticality?: number | null;
  context_score?: number | null;
  risk_factor_names?: string | null;
  risk_factor_values?: string | null;
  risk_factor_offset?: number | null;

  summary?: string | null;
  description?: string | null;
  cveDescription?: string | null;
  type_display_name?: string | null;
  type_id?: string | null;
  attack_pattern_names?: string | null;
  attack_technique_names?: string | null;
  attack_tactic_names?: string | null;

  sla_days?: number | null;
  sla_level?: string | null;
  risk_owner_name?: string | null;
  remediation_owner_name?: string | null;

  source_count?: number | null;
  source_uids?: string | null;
  source_record_uids?: string | null;
  source_links?: string | null;
  connector_names?: string | null;
  source_connector_names?: string | null;
  connector_categories?: string | null;
  data_integration_titles?: string | null;
  informed_user_names?: string | null;
  data_model_name?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  date_created?: string | null;
  last_updated?: string | null;
  risk_scoring_model_name?: string | null;
  sla_definition_name?: string | null;
  confidence?: string | null;
  category_count?: number | null;
  categories?: string | null;

  remediation_summary?: string | null;
  remediation_plan?: string | null;
  remediation_notes?: string | null;
  remediation_status?: string | null;
  remediation_due_date?: string | null;
  remediation_updated_at?: string | null;
  remediation_updated_by?: string | null;

  disposition?: FindingDisposition;
  disposition_state?: string | null;
  disposition_reason?: string | null;
  disposition_comment?: string | null;
  disposition_created_at?: string | null;
  disposition_expires_at?: string | null;
  disposition_created_by?: string | null;
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
}

const API_BASE_URL = getApiBaseUrl();

export interface RiskBandSummary {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export type RiskBandFilter = "All" | "Critical" | "High" | "Medium" | "Low";
export type FindingsSortBy =
  | "risk_score"
  | "internal_risk_score"
  | "source_risk_score"
  | "cvss_score"
  | "epss_score"
  | "age_in_days"
  | "due_date"
  | "source";
export type SortOrder = "asc" | "desc";

export interface ScoresSummary {
  total_findings: number;
  risk_bands: RiskBandSummary;
  kevFindingsTotal?: number;
  kevRiskBands?: RiskBandSummary;
}

export interface PaginatedFindings {
  items: ScoredFinding[];
  total: number;
  page: number;
  page_size: number;
}

export interface SeedUploadResult {
  inserted: number;
  source: string;
  total_findings: number;
}

export interface SourceSummary {
  source: string;
  total_findings: number;
  risk_bands: RiskBandSummary;
}

export interface SourceRenameResult {
  old_source: string;
  new_source: string;
  updated_rows: number;
}

export interface SourceDeleteResult {
  source: string;
  deleted_rows: number;
  total_findings_remaining: number;
}

export interface RiskWeightsConfig {
  cvss_weight: number;
  epss_weight: number;
  kev_weight: number;
  asset_criticality_weight: number;
  context_weight: number;
}

export interface RiskWeightsUpdateResult {
  updated_rows: number;
  weights: RiskWeightsConfig;
}

export interface FindingDispositionUpdateRequest {
  disposition: Exclude<FindingDisposition, "none">;
  reason?: string | null;
  comment?: string | null;
  expires_at?: string | null;
  actor?: string | null;
}

export interface FindingDispositionResult {
  id: number;
  uid?: string | null;
  record_id?: string | null;
  disposition: FindingDisposition;
  disposition_state?: string | null;
  disposition_reason?: string | null;
  disposition_comment?: string | null;
  disposition_created_at?: string | null;
  disposition_expires_at?: string | null;
  disposition_created_by?: string | null;
}

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  if (res.ok) {
    return res.json();
  }

  let message = fallbackMessage;
  try {
    const body = await res.json();
    if (body?.detail && typeof body.detail === "string") {
      message = body.detail;
    }
  } catch {
    // Keep fallback message.
  }
  throw new Error(message);
}

export async function getTopScores(): Promise<ScoredFinding[]> {
  const res = await fetch(`${API_BASE_URL}/scores/top10`);
  return parseJsonOrThrow(res, `Failed to fetch scores: ${res.status} ${res.statusText}`);
}

export async function getScoresSummary(): Promise<ScoresSummary> {
  const res = await fetch(`${API_BASE_URL}/scores/summary`);
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
  const res = await fetch(`${API_BASE_URL}/scores/all?${params.toString()}`);
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
  const encodedBand = encodeURIComponent(riskBand);
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (source && source.trim()) {
    params.set("source", source.trim());
  }
  const res = await fetch(
    `${API_BASE_URL}/scores/band/${encodedBand}?${params.toString()}`
  );
  return parseJsonOrThrow(
    res,
    `Failed to fetch findings by risk band: ${res.status} ${res.statusText}`
  );
}

export async function seedQualysCsv(
  file: File,
  source: string
): Promise<SeedUploadResult> {
  const formData = new FormData();
  formData.append("source", source);
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/scores/seed/qualys-csv`, {
    method: "POST",
    body: formData,
  });

  return parseJsonOrThrow(
    res,
    `Failed to seed CSV: ${res.status} ${res.statusText}`
  );
}

export async function getSourcesSummary(): Promise<SourceSummary[]> {
  const res = await fetch(`${API_BASE_URL}/scores/sources`);
  return parseJsonOrThrow(
    res,
    `Failed to fetch sources: ${res.status} ${res.statusText}`
  );
}

export async function getFindingById(findingDbId: number): Promise<ScoredFinding> {
  const res = await fetch(`${API_BASE_URL}/scores/findings/${findingDbId}`);
  return parseJsonOrThrow(
    res,
    `Failed to fetch finding: ${res.status} ${res.statusText}`
  );
}

export async function renameSource(
  oldSource: string,
  newSource: string
): Promise<SourceRenameResult> {
  const encoded = encodeURIComponent(oldSource);
  const res = await fetch(`${API_BASE_URL}/scores/sources/${encoded}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ new_source: newSource }),
  });
  return parseJsonOrThrow(
    res,
    `Failed to rename source: ${res.status} ${res.statusText}`
  );
}

export async function deleteSource(source: string): Promise<SourceDeleteResult> {
  const encoded = encodeURIComponent(source);
  const res = await fetch(`${API_BASE_URL}/scores/sources/${encoded}`, {
    method: "DELETE",
  });
  return parseJsonOrThrow(
    res,
    `Failed to delete source: ${res.status} ${res.statusText}`
  );
}

export async function getRiskWeights(): Promise<RiskWeightsConfig> {
  const res = await fetch(`${API_BASE_URL}/scores/weights`);
  return parseJsonOrThrow(
    res,
    `Failed to fetch risk weights: ${res.status} ${res.statusText}`
  );
}

export async function updateRiskWeights(
  weights: RiskWeightsConfig
): Promise<RiskWeightsUpdateResult> {
  const res = await fetch(`${API_BASE_URL}/scores/weights`, {
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

export async function setFindingDisposition(
  findingDbId: number,
  payload: FindingDispositionUpdateRequest
): Promise<FindingDispositionResult> {
  const res = await fetch(`${API_BASE_URL}/scores/findings/${findingDbId}/disposition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(
    res,
    `Failed to update disposition: ${res.status} ${res.statusText}`
  );
}

export async function clearFindingDisposition(
  findingDbId: number,
  actor?: string | null
): Promise<FindingDispositionResult> {
  const params = new URLSearchParams();
  if (actor && actor.trim()) {
    params.set("actor", actor.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${API_BASE_URL}/scores/findings/${findingDbId}/disposition/clear${suffix}`,
    { method: "POST" }
  );
  return parseJsonOrThrow(
    res,
    `Failed to clear disposition: ${res.status} ${res.statusText}`
  );
}

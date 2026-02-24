// src/api.ts

export interface ScoredFinding {
  id: number;

  source: string;
  finding_id: string;
  asset_id: string;
  hostname?: string | null;
  ip_address?: string | null;
  operating_system?: string | null;
  asset_type?: string | null;

  asset_criticality: number;

  cve_id?: string | null;
  cwe_id?: string | null;
  description?: string | null;
  isKev?: boolean;
  kevDateAdded?: string | null;
  kevDueDate?: string | null;
  slaHours?: number | null;
  kevVendorProject?: string | null;
  kevProduct?: string | null;
  kevVulnerabilityName?: string | null;
  kevShortDescription?: string | null;
  kevRequiredAction?: string | null;
  kevRansomwareUse?: string | null;

  cvss_score: number;
  cvss_severity?: string | null;
  epss_score: number;

  attack_vector?: string | null;
  privileges_required?: string | null;
  user_interaction?: string | null;
  vector_string?: string | null;

  vuln_published_date?: string | null;
  vuln_age_days?: number | null;
  port?: number | null;
  service?: string | null;
  internet_exposed: boolean;
  auth_required: boolean;
  detection_method?: string | null;
  first_detected?: string | null;
  last_detected?: string | null;
  times_detected?: number | null;

  risk_score: number;
  risk_band: string;

  finding_key?: string | null;
  lifecycle_status?: string | null;
  is_present_in_latest_scan?: boolean | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  fixed_at?: string | null;
  status_changed_at?: string | null;
  last_scan_run_id?: number | null;

  disposition?: FindingDisposition;
  disposition_state?: string | null;
  disposition_reason?: string | null;
  disposition_comment?: string | null;
  disposition_created_at?: string | null;
  disposition_expires_at?: string | null;
  disposition_created_by?: string | null;
}

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getTopScores(): Promise<ScoredFinding[]> {
  const res = await fetch(`${API_BASE_URL}/scores/top10`);
  if (!res.ok) {
    throw new Error(`Failed to fetch scores: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface RiskBandSummary {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export type RiskBandFilter = "All" | "Critical" | "High" | "Medium" | "Low";
export type FindingsSortBy =
  | "risk_score"
  | "cvss_score"
  | "epss_score"
  | "vuln_age_days"
  | "source";
export type SortOrder = "asc" | "desc";

export interface ScoresSummary {
  total_findings: number;
  risk_bands: RiskBandSummary;
  kevFindingsTotal?: number;
  kevRiskBands?: RiskBandSummary;
}

export async function getScoresSummary(): Promise<ScoresSummary> {
  const res = await fetch(`${API_BASE_URL}/scores/summary`);
  if (!res.ok) {
    throw new Error(`Failed to fetch scores summary: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  internet_exposed_weight: number;
  asset_criticality_weight: number;
  vuln_age_weight: number;
  auth_required_weight: number;
}

export interface RiskWeightsUpdateResult {
  updated_rows: number;
  weights: RiskWeightsConfig;
}

export type FindingDisposition =
  | "none"
  | "ignored"
  | "risk_accepted"
  | "false_positive"
  | "not_applicable";

export interface FindingDispositionUpdateRequest {
  disposition: Exclude<FindingDisposition, "none">;
  reason?: string | null;
  comment?: string | null;
  expires_at?: string | null;
  actor?: string | null;
}

export interface FindingDispositionResult {
  id: number;
  finding_id: string;
  disposition: FindingDisposition;
  disposition_state?: string | null;
  disposition_reason?: string | null;
  disposition_comment?: string | null;
  disposition_created_at?: string | null;
  disposition_expires_at?: string | null;
  disposition_created_by?: string | null;
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
  if (!res.ok) {
    throw new Error(
      `Failed to fetch findings: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
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
  if (!res.ok) {
    throw new Error(
      `Failed to fetch findings by risk band: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
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

  if (!res.ok) {
    let message = `Failed to seed CSV: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the default message when response isn't JSON.
    }
    throw new Error(message);
  }

  return res.json();
}

export async function getSourcesSummary(): Promise<SourceSummary[]> {
  const res = await fetch(`${API_BASE_URL}/scores/sources`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sources: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getFindingById(findingDbId: number): Promise<ScoredFinding> {
  const res = await fetch(`${API_BASE_URL}/scores/findings/${findingDbId}`);
  if (!res.ok) {
    let message = `Failed to fetch finding: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
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
  if (!res.ok) {
    let message = `Failed to rename source: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
}

export async function deleteSource(source: string): Promise<SourceDeleteResult> {
  const encoded = encodeURIComponent(source);
  const res = await fetch(`${API_BASE_URL}/scores/sources/${encoded}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    let message = `Failed to delete source: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getRiskWeights(): Promise<RiskWeightsConfig> {
  const res = await fetch(`${API_BASE_URL}/scores/weights`);
  if (!res.ok) {
    throw new Error(`Failed to fetch risk weights: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  if (!res.ok) {
    let message = `Failed to update risk weights: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
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
  if (!res.ok) {
    let message = `Failed to update disposition: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
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
  if (!res.ok) {
    let message = `Failed to clear disposition: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail && typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  return res.json();
}

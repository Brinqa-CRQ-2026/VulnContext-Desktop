// src/api.ts

export interface ScoredFinding {
  id: number;

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
  resolved: boolean;
  resolved_at?: string | null;
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

export interface ScoresSummary {
  total_findings: number;
  risk_bands: RiskBandSummary;
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

export async function getAllFindings(
  page: number,
  pageSize: number
): Promise<PaginatedFindings> {
  const res = await fetch(
    `${API_BASE_URL}/scores/all?page=${page}&page_size=${pageSize}`
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch findings: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function markFindingResolved(
  findingId: number,
  resolved: boolean = true,
  resolvedAt?: string | null
): Promise<ScoredFinding> {
  const resolved_at = resolved
    ? resolvedAt ?? new Date().toISOString()
    : null;

  const res = await fetch(
    `${API_BASE_URL}/scores/${findingId}/resolve?resolved=${resolved}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resolved, resolved_at }),
    }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to update finding: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export interface RiskOverTimePoint {
  date: string;
  total_risk: number;
  resolved_count: number;
  resolved_risk: number;
}

export interface RiskOverTimeSeries {
  days: number;
  points: RiskOverTimePoint[];
}

export async function getRiskOverTime(
  days: number = 30
): Promise<RiskOverTimeSeries> {
  const res = await fetch(`${API_BASE_URL}/scores/risk-over-time?days=${days}`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch risk over time: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export interface AssetVulnCount {
  asset_id: string;
  hostname: string | null;
  vuln_count: number;
  total_risk: number;
}

export async function getAssetVulnerabilityCounts(): Promise<AssetVulnCount[]> {
  const res = await fetch(`${API_BASE_URL}/scores/assets`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch asset vulnerability counts: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export interface AttackVectorCount {
  attack_vector: string;
  count: number;
  percentage: number;
}

export async function getAttackVectorDistribution(): Promise<AttackVectorCount[]> {
  const res = await fetch(`${API_BASE_URL}/scores/attack-vectors`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch attack vector distribution: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export interface VulnerabilityAgeBucket {
  age_range: string;
  count: number;
  percentage: number;
}

export async function getVulnerabilityAgeDistribution(): Promise<VulnerabilityAgeBucket[]> {
  const res = await fetch(`${API_BASE_URL}/scores/vulnerability-age`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch vulnerability age distribution: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function getVulnerabilitiesByAsset(assetId: string): Promise<ScoredFinding[]> {
  const res = await fetch(`${API_BASE_URL}/scores/by-asset/${encodeURIComponent(assetId)}`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch vulnerabilities for asset: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function getVulnerabilitiesByAge(ageRange: string): Promise<ScoredFinding[]> {
  const res = await fetch(`${API_BASE_URL}/scores/by-age/${encodeURIComponent(ageRange)}`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch vulnerabilities for age range: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export interface RemediationTimeBucket {
  bucket_label: string;
  count: number;
  percentage: number;
}

export async function getRemediationTimeHistogram(): Promise<RemediationTimeBucket[]> {
  const res = await fetch(`${API_BASE_URL}/scores/remediation-time-histogram`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch remediation time histogram: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function getCriticalUrgentFindings(limit: number = 5): Promise<ScoredFinding[]> {
  const res = await fetch(`${API_BASE_URL}/scores/critical-urgent?limit=${limit}`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch critical urgent findings: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}
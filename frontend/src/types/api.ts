import type { AssetScoreDistribution, AssetTypeDistributionItem } from "./charts";
import type { RiskBandSummary } from "./risk";
import type { AssetSummary } from "./topology";

export interface ScoredFinding {
  disposition: boolean;
  id: string;
  source: string;
  asset_id: string;
  business_service?: string | null;
  application?: string | null;

  uid?: string | null;
  record_id?: string | null;
  display_name?: string | null;
  record_link?: string | null;

  status?: string | null;
  source_status?: string | null;
  compliance_status?: string | null;
  severity?: string | null;
  lifecycle_status?: string | null;

  age_in_days?: number | null;
  first_found?: string | null;
  last_found?: string | null;
  due_date?: string | null;

  target_ids?: string | null;
  target_names?: string | null;

  cve_id?: string | null;
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
  score_source?: string | null;
  crq_score_version?: string | null;
  crq_scored_at?: string | null;
  internal_risk_notes?: string | null;
  crq_cvss_score?: number | null;
  crq_epss_score?: number | null;
  crq_epss_percentile?: number | null;
  crq_epss_multiplier?: number | null;
  crq_is_kev?: boolean;
  crq_kev_bonus?: number | null;
  crq_age_days?: number | null;
  crq_age_bonus?: number | null;
  crq_notes?: string | null;

  asset_criticality?: number | null;
  asset_name?: string | null;

  summary?: string | null;
  description?: string | null;
  cveDescription?: string | null;
  attack_pattern_names?: string | null;
  attack_technique_names?: string | null;
  attack_tactic_names?: string | null;

  risk_owner_name?: string | null;
  remediation_owner_name?: string | null;
  remediation_status?: string | null;

  detail_source?: string | null;
  detail_fetched_at?: string | null;
}

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

export interface AssetAnalyticsResponse {
  total_assets: number;
  asset_criticality_distribution: AssetScoreDistribution;
  finding_risk_distribution: AssetScoreDistribution;
}

export interface BusinessServiceAnalyticsTotals {
  applications: number;
  assets: number;
  findings: number;
}

export interface BusinessServiceAnalytics {
  service_risk_score: number | null;
  service_risk_label: string | null;
  service_priority_score?: number | null;
  business_criticality_score: number | null;
  business_criticality_max: number;
  business_criticality_label: string | null;
  totals: BusinessServiceAnalyticsTotals;
  asset_criticality_distribution: AssetScoreDistribution;
  asset_type_distribution: AssetTypeDistributionItem[];
}

export interface SourceSummary {
  source: string;
  total_findings: number;
  risk_bands: RiskBandSummary;
}

export interface PaginatedAssets {
  items: AssetSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface AssetFindingsPageResponse {
  asset: AssetSummary;
  items: ScoredFinding[];
  total: number;
  page: number;
  page_size: number;
}

export type AssetFindingsPage = AssetFindingsPageResponse;

export interface AssetFindingsAnalytics {
  total_findings: number;
  kev_findings: number;
  critical_high_findings: number;
  highest_risk_band?: string | null;
  average_risk_score?: number | null;
  max_risk_score?: number | null;
  oldest_priority_age_days?: number | null;
  risk_bands: RiskBandSummary;
}

export interface AssetFindingsAnalyticsAsset {
  asset_id: string;
  hostname?: string | null;
  business_unit?: string | null;
  business_service?: string | null;
  application?: string | null;
  status?: string | null;
  environment?: string | null;
  internal_or_external?: string | null;
  device_type?: string | null;
  category?: string | null;
}

export interface AssetFindingsAnalyticsResponse {
  asset: AssetFindingsAnalyticsAsset;
  analytics: AssetFindingsAnalytics;
}

export interface FindingEnrichment {
  finding_id: string;
  summary?: string | null;
  description?: string | null;
  record_link?: string | null;
  source_status?: string | null;
  severity?: string | null;
  due_date?: string | null;
  attack_pattern_names?: string | null;
  attack_technique_names?: string | null;
  attack_tactic_names?: string | null;
  risk_owner_name?: string | null;
  remediation_owner_name?: string | null;
  remediation_status?: string | null;
  detail_source?: string | null;
  detail_fetched_at?: string | null;
}

export interface FairLossPredictionRequest {
  control_context: Record<string, number | Record<string, number>>;
  primary_loss_mean: number;
  secondary_loss_mean: number;
  iterations?: number;
}

export interface FairLossHistogramPoint {
  loss: number;
  probability: number;
}

export interface FairLossPredictionResponse {
  control_score: number;
  vulnerability: number;
  tef_mean: number;
  lef_mean: number;
  loss_mean: number;
  loss_p50: number;
  loss_p90: number;
  loss_p95: number;
  loss_p99: number;
  worst_loss: number;
  lm_mean: number;
  primary_mean: number;
  secondary_mean: number;
  histogram: FairLossHistogramPoint[];
}

export interface ControlAssessment {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  control_score: number;
  confidence: number;
  prevent_score: number;
  detect_score: number;
  respond_score: number;
  contain_score: number;
  answers: Record<string, Record<string, number>>;
}

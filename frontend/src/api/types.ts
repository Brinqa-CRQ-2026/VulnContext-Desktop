export interface ScoredFinding {
  id: string;
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
  score_source?: string | null;
  crq_score_version?: string | null;
  crq_scored_at?: string | null;
  internal_risk_score?: number | null;
  internal_risk_band?: string | null;
  internal_risk_notes?: string | null;
  crq_cvss_score?: number | null;
  crq_epss_score?: number | null;
  crq_epss_percentile?: number | null;
  crq_epss_multiplier?: number | null;
  crq_is_kev?: boolean | null;
  crq_kev_bonus?: number | null;
  crq_age_days?: number | null;
  crq_age_bonus?: number | null;
  crq_notes?: string | null;

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
  | "internal_risk_score"
  | "source_risk_score"
  | "cvss_score"
  | "epss_score"
  | "age_in_days"
  | "due_date"
  | "source";

export type SortOrder = "asc" | "desc";
export type ScopedFindingSortBy = "risk_score" | "age_in_days" | "status";
export type AssetListSortBy =
  | "name"
  | "asset_id"
  | "asset_criticality"
  | "status"
  | "finding_count";

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

export interface SourceSummary {
  source: string;
  total_findings: number;
  risk_bands: RiskBandSummary;
}

export interface TopologyMetrics {
  total_business_services: number;
  total_applications: number;
  total_assets: number;
  total_findings: number;
}

export interface CompanySummary {
  name: string;
}

export interface BusinessUnitSummary {
  company: CompanySummary | null;
  business_unit: string;
  slug: string;
  metrics: TopologyMetrics;
}

export interface BusinessServiceSummary {
  business_service: string;
  slug: string;
  metrics: TopologyMetrics;
}

export interface ApplicationSummary {
  application: string;
  slug: string;
  metrics: TopologyMetrics;
}

export interface AssetSummary {
  asset_id: string;
  hostname?: string | null;
  company?: string | null;
  business_unit?: string | null;
  application?: string | null;
  business_service?: string | null;
  status?: string | null;
  compliance_status?: string | null;
  asset_criticality?: number | null;
  exposure_score?: number | null;
  business_criticality_score?: number | null;
  data_sensitivity_score?: number | null;
  asset_type_weight?: number | null;
  is_public_facing?: boolean | null;
  has_sensitive_data?: boolean | null;
  crown_jewel_flag?: boolean | null;
  internet_exposed_flag?: boolean | null;
  finding_count: number;
}

export interface BusinessUnitDetail {
  company: CompanySummary | null;
  business_unit: string;
  slug: string;
  uid?: string | null;
  uuid?: string | null;
  description?: string | null;
  owner?: string | null;
  data_integration?: string | null;
  connector?: string | null;
  connector_category?: string | null;
  data_model?: string | null;
  last_integration_transaction_id?: string | null;
  flow_state?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  source_last_modified_at?: string | null;
  source_last_integrated_at?: string | null;
  source_created_at?: string | null;
  source_updated_at?: string | null;
  metrics: TopologyMetrics;
  business_services: BusinessServiceSummary[];
}

export interface BusinessServiceDetail {
  company: CompanySummary | null;
  business_unit: string;
  business_service: string;
  slug: string;
  uid?: string | null;
  uuid?: string | null;
  description?: string | null;
  criticality_label?: string | null;
  division?: string | null;
  manager?: string | null;
  data_integration?: string | null;
  connector?: string | null;
  connector_category?: string | null;
  data_model?: string | null;
  last_integration_transaction_id?: string | null;
  flow_state?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  source_last_modified_at?: string | null;
  source_last_integrated_at?: string | null;
  source_created_at?: string | null;
  source_updated_at?: string | null;
  metrics: TopologyMetrics;
  applications: ApplicationSummary[];
  direct_assets: AssetSummary[];
}

export interface ApplicationDetail {
  company: CompanySummary | null;
  business_unit: string;
  business_service: string;
  application: string;
  slug: string;
  first_seen_at?: string | null;
  metrics: TopologyMetrics;
  assets: AssetSummary[];
}

export interface AssetDetail extends AssetSummary {
  uid?: string | null;
  dnsname?: string | null;
  uuid?: string | null;
  tracking_method?: string | null;
  owner?: string | null;
  service_team?: string | null;
  division?: string | null;
  it_sme?: string | null;
  it_director?: string | null;
  location?: string | null;
  internal_or_external?: string | null;
  device_type?: string | null;
  category?: string | null;
  virtual_or_physical?: string | null;
  compliance_flags?: string | null;
  pci?: boolean | null;
  pii?: boolean | null;
  public_ip_addresses?: string | null;
  private_ip_addresses?: string | null;
  last_authenticated_scan?: string | null;
  last_scanned?: string | null;
  qualys_vm_host_id?: string | null;
  qualys_vm_host_uid?: string | null;
  qualys_vm_host_link?: string | null;
  qualys_vm_host_integration?: string | null;
  servicenow_host_id?: string | null;
  servicenow_host_uid?: string | null;
  servicenow_host_link?: string | null;
  servicenow_host_integration?: string | null;
  detail_source?: string | null;
  detail_fetched_at?: string | null;
}

export interface AssetEnrichment {
  asset_id: string;
  status:
    | "missing_token"
    | "unauthorized_token"
    | "no_related_source"
    | "partial_success"
    | "success"
    | "upstream_error";
  reason: string;
  uid?: string | null;
  dnsname?: string | null;
  mac_addresses?: string | null;
  uuid?: string | null;
  tracking_method?: string | null;
  owner?: string | null;
  service_team?: string | null;
  division?: string | null;
  it_sme?: string | null;
  it_director?: string | null;
  location?: string | null;
  internal_or_external?: string | null;
  device_type?: string | null;
  category?: string | null;
  virtual_or_physical?: string | null;
  compliance_flags?: string | null;
  pci?: boolean | null;
  pii?: boolean | null;
  last_authenticated_scan?: string | null;
  last_scanned?: string | null;
  detail_source?: string | null;
  detail_fetched_at?: string | null;
}

export interface AssetFindingsPage {
  asset: AssetSummary;
  items: ScoredFinding[];
  total: number;
  page: number;
  page_size: number;
}

export interface FindingRouteOrigin {
  mode: "global" | "asset";
  businessUnitSlug?: string | null;
  businessUnitLabel?: string | null;
  businessServiceSlug?: string | null;
  businessServiceLabel?: string | null;
  applicationSlug?: string | null;
  applicationLabel?: string | null;
  assetId?: string | null;
  assetLabel?: string | null;
}

import type { AssetScoreDistribution } from "./charts";
import type { RiskBand, RiskBandSummary } from "./risk";

export type AssetListSortBy =
  | "name"
  | "asset_type"
  | "asset_criticality"
  | "status"
  | "finding_count";

export interface TopologyMetrics {
  total_business_services: number;
  total_applications: number;
  total_assets: number;
  total_findings: number;
}

export interface CompanySummary {
  name: string;
}

export interface BusinessUnitRiskTrendPoint {
  period: string;
  score: number;
}

export interface BusinessUnitSummary {
  company: CompanySummary | null;
  business_unit: string;
  slug: string;
  description: string | null;
  metrics: TopologyMetrics;
  risk_score: number | null;
  risk_band: "High" | "Medium" | "Low" | string | null;
  priority_score?: number | null;
  risk_trend: BusinessUnitRiskTrendPoint[] | null;
}

export interface BusinessUnitRiskOverview {
  business_unit: string;
  slug: string;
  risk_score: number | null;
  risk_band: RiskBand | string | null;
  priority_score?: number | null;
  risk_trend: BusinessUnitRiskTrendPoint[];
  severity_counts: RiskBandSummary;
  finding_risk_distribution: AssetScoreDistribution;
}

export interface BusinessServiceSummary {
  business_service: string;
  slug: string;
  metrics: TopologyMetrics;
  risk_score?: number | null;
  risk_band?: RiskBand | string | null;
  priority_score?: number | null;
  business_criticality_score?: number | null;
}

export interface ApplicationSummary {
  application: string;
  slug: string;
  description?: string | null;
  tags?: string[] | null;
  metrics: TopologyMetrics;
  aggregated_asset_risk?: number | null;
  compliance_score?: number | null;
  application_risk_score?: number | null;
  scored_at?: string | null;
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
  tags?: string[] | null;
  environment?: string | null;
  aggregated_finding_risk?: number | null;
  exposure_score?: number | null;
  data_sensitivity_score?: number | null;
  environment_score?: number | null;
  asset_type_score?: number | null;
  asset_context_score?: number | null;
  asset_risk_score?: number | null;
  scored_at?: string | null;
  device_type?: string | null;
  category?: string | null;
  compliance_flags?: string | null;
  pci?: boolean | null;
  pii?: boolean | null;
  finding_count: number;
}

export interface BusinessUnitDetail {
  company: CompanySummary | null;
  business_unit: string;
  slug: string;
  source_id?: string | null;
  description?: string | null;
  owner?: string | null;
  risk_score?: number | null;
  risk_band?: RiskBand | string | null;
  priority_score?: number | null;
  metrics: TopologyMetrics;
  business_services: BusinessServiceSummary[];
}

export interface BusinessServiceDetail {
  company: CompanySummary | null;
  business_unit: string;
  business_service: string;
  slug: string;
  source_id?: string | null;
  description?: string | null;
  criticality_label?: string | null;
  division?: string | null;
  manager?: string | null;
  risk_score?: number | null;
  risk_band?: RiskBand | string | null;
  priority_score?: number | null;
  business_criticality_score?: number | null;
  aggregated_application_risk?: number | null;
  aggregated_direct_asset_risk?: number | null;
  scored_at?: string | null;
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
  description?: string | null;
  tags?: string[] | null;
  first_seen_at?: string | null;
  metrics: TopologyMetrics;
  aggregated_asset_risk?: number | null;
  compliance_score?: number | null;
  application_risk_score?: number | null;
  scored_at?: string | null;
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
  qualys_vm_host_link?: string | null;
  servicenow_host_id?: string | null;
  servicenow_host_link?: string | null;
  detail_source?: string | null;
  detail_fetched_at?: string | null;
}

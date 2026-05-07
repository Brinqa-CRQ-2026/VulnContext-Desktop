import type { RiskBand } from "../../types/risk";

export type BusinessUnitRiskBand = RiskBand;

export interface BusinessUnitRiskTrendChartPoint {
  month: string;
  score: number;
}

export type ApplicationSortKey = "application" | "slug" | "asset_count" | "finding_count";

export type AssetSortKey =
  | "name"
  | "asset_type"
  | "business_service"
  | "application"
  | "asset_criticality"
  | "status"
  | "finding_count";

export type FindingSortKey =
  | "title"
  | "finding_id"
  | "status"
  | "risk_band"
  | "risk_score"
  | "source_risk_score"
  | "cvss_score"
  | "epss_score"
  | "age_in_days"
  | "kev";

export type FindingsSortBy =
  | "risk_score"
  | "internal_risk_score"
  | "source_risk_score"
  | "cvss_score"
  | "epss_score"
  | "age_in_days"
  | "due_date"
  | "source";

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

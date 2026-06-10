import type {
  AssetSummary,
  BusinessServiceSummary,
  BusinessUnitSummary,
} from "../../../types";

export function buildBusinessUnit(
  overrides: Partial<BusinessUnitSummary> = {}
): BusinessUnitSummary {
  return {
    company: { name: "Acme" },
    business_unit: "Online Store",
    slug: "online-store",
    description: "Digital commerce",
    metrics: {
      total_business_services: 1,
      total_applications: 2,
      total_assets: 3,
      total_findings: 4,
    },
    risk_score: 7.5,
    risk_band: "High",
    risk_trend: [],
    ...overrides,
  };
}

export function buildBusinessService(
  overrides: Partial<BusinessServiceSummary> = {}
): BusinessServiceSummary {
  return {
    business_service: "Digital Storefront",
    slug: "digital-storefront",
    metrics: {
      total_business_services: 0,
      total_applications: 2,
      total_assets: 3,
      total_findings: 4,
    },
    risk_score: 8,
    risk_band: "High",
    business_criticality_score: 5,
    ...overrides,
  };
}

export function buildAsset(overrides: Partial<AssetSummary> = {}): AssetSummary {
  return {
    asset_id: "asset-1",
    hostname: "asset-1.example.com",
    business_unit: "Online Store",
    business_service: "Digital Storefront",
    application: "Identity",
    status: "Active",
    finding_count: 3,
    ...overrides,
  };
}

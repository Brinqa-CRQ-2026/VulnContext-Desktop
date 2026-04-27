import { buildApiUrl, buildBrinqaEnrichmentRequestInit, parseJsonOrThrow } from "./client";
import type {
  AssetListSortBy,
  AssetFindingsAnalyticsResponse,
  AssetAnalyticsResponse,
  ApplicationDetail,
  AssetDetail,
  AssetEnrichment,
  AssetFindingsPage,
  BusinessServiceDetail,
  BusinessUnitDetail,
  BusinessUnitSummary,
  FindingsSortBy,
  PaginatedAssets,
  SortOrder,
} from "./types";

export async function getBusinessUnits(): Promise<BusinessUnitSummary[]> {
  const res = await fetch(buildApiUrl("/topology/business-units"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch business units: ${res.status} ${res.statusText}`
  );
}

export async function getBusinessUnitDetail(
  businessUnitSlug: string
): Promise<BusinessUnitDetail> {
  const res = await fetch(buildApiUrl(`/topology/business-units/${businessUnitSlug}`));
  return parseJsonOrThrow(
    res,
    `Failed to fetch business unit detail: ${res.status} ${res.statusText}`
  );
}

export async function getBusinessServiceDetail(
  businessUnitSlug: string,
  businessServiceSlug: string
): Promise<BusinessServiceDetail> {
  const res = await fetch(
    buildApiUrl(
      `/topology/business-units/${businessUnitSlug}/business-services/${businessServiceSlug}`
    )
  );
  return parseJsonOrThrow(
    res,
    `Failed to fetch business service detail: ${res.status} ${res.statusText}`
  );
}

export async function getApplicationDetail(
  businessUnitSlug: string,
  businessServiceSlug: string,
  applicationSlug: string
): Promise<ApplicationDetail> {
  const res = await fetch(
    buildApiUrl(
      `/topology/business-units/${businessUnitSlug}/business-services/${businessServiceSlug}/applications/${applicationSlug}`
    )
  );
  return parseJsonOrThrow(
    res,
    `Failed to fetch application detail: ${res.status} ${res.statusText}`
  );
}

export async function getAssetDetail(assetId: string): Promise<AssetDetail> {
  const res = await fetch(buildApiUrl(`/assets/${assetId}`));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset detail: ${res.status} ${res.statusText}`
  );
}

export async function getAssetEnrichment(assetId: string): Promise<AssetEnrichment> {
  const res = await fetch(
    buildApiUrl(`/assets/${assetId}/enrichment`),
    buildBrinqaEnrichmentRequestInit()
  );
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset enrichment: ${res.status} ${res.statusText}`
  );
}

export async function getAssetFindings(assetId: string): Promise<AssetFindingsPage> {
  const res = await fetch(buildApiUrl(`/assets/${assetId}/findings`));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset findings: ${res.status} ${res.statusText}`
  );
}

export async function getAssetFindingsAnalytics(
  assetId: string,
  {
    riskBand,
    kevOnly,
    source,
    search,
  }: {
    riskBand: "All" | "Critical" | "High" | "Medium" | "Low";
    kevOnly: boolean;
    source?: string | null;
    search?: string | null;
  }
): Promise<AssetFindingsAnalyticsResponse> {
  const params = new URLSearchParams();
  if (riskBand !== "All") {
    params.set("risk_band", riskBand);
  }
  if (kevOnly) {
    params.set("kev_only", "true");
  }
  if (source && source !== "All") {
    params.set("source", source);
  }
  if (search) {
    params.set("search", search);
  }
  const res = await fetch(buildApiUrl(`/assets/${assetId}/findings/analytics`, params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset findings analytics: ${res.status} ${res.statusText}`
  );
}

export async function getAssetFindingsPage(
  assetId: string,
  {
    page,
    pageSize,
    sortBy,
    sortOrder,
    riskBand,
    kevOnly,
    source,
    search,
  }: {
    page: number;
    pageSize: number;
    sortBy: FindingsSortBy;
    sortOrder: SortOrder;
    riskBand: "All" | "Critical" | "High" | "Medium" | "Low";
    kevOnly: boolean;
    source?: string | null;
    search?: string | null;
  }
): Promise<AssetFindingsPage> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (riskBand !== "All") {
    params.set("risk_band", riskBand);
  }
  if (kevOnly) {
    params.set("kev_only", "true");
  }
  if (source && source !== "All") {
    params.set("source", source);
  }
  if (search) {
    params.set("search", search);
  }
  const res = await fetch(buildApiUrl(`/assets/${assetId}/findings`, params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset findings: ${res.status} ${res.statusText}`
  );
}

export async function getAssetsPage({
  page,
  pageSize,
  businessUnit,
  businessService,
  application,
  status,
  environment,
  compliance,
  search,
  directOnly,
  sortBy,
  sortOrder,
}: {
  page: number;
  pageSize: number;
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  status?: string | null;
  environment?: string | null;
  compliance?: string | null;
  search?: string | null;
  directOnly?: boolean;
  sortBy: AssetListSortBy;
  sortOrder: SortOrder;
}): Promise<PaginatedAssets> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (businessUnit) params.set("business_unit", businessUnit);
  if (businessService) params.set("business_service", businessService);
  if (application) params.set("application", application);
  if (status) params.set("status", status);
  if (environment) params.set("environment", environment);
  if (compliance) params.set("compliance", compliance);
  if (search) params.set("search", search);
  if (directOnly) params.set("direct_only", "true");
  const res = await fetch(buildApiUrl("/assets", params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch assets: ${res.status} ${res.statusText}`
  );
}

export async function getAssetsAnalytics({
  businessUnit,
  businessService,
  application,
  status,
  environment,
  compliance,
  search,
  directOnly,
}: {
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  status?: string | null;
  environment?: string | null;
  compliance?: string | null;
  search?: string | null;
  directOnly?: boolean;
}): Promise<AssetAnalyticsResponse> {
  const params = new URLSearchParams();
  if (businessUnit) params.set("business_unit", businessUnit);
  if (businessService) params.set("business_service", businessService);
  if (application) params.set("application", application);
  if (status) params.set("status", status);
  if (environment) params.set("environment", environment);
  if (compliance) params.set("compliance", compliance);
  if (search) params.set("search", search);
  if (directOnly) params.set("direct_only", "true");
  const res = await fetch(buildApiUrl("/assets/analytics", params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset analytics: ${res.status} ${res.statusText}`
  );
}

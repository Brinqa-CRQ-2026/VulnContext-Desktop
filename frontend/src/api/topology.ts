import { buildApiUrl, parseJsonOrThrow } from "./client";
import type {
  AssetListSortBy,
  ApplicationDetail,
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

export async function getAssetFindings(assetId: string): Promise<AssetFindingsPage> {
  const res = await fetch(buildApiUrl(`/assets/${assetId}/findings`));
  return parseJsonOrThrow(
    res,
    `Failed to fetch asset findings: ${res.status} ${res.statusText}`
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
  if (search) params.set("search", search);
  if (directOnly) params.set("direct_only", "true");
  const res = await fetch(buildApiUrl("/assets", params));
  return parseJsonOrThrow(
    res,
    `Failed to fetch assets: ${res.status} ${res.statusText}`
  );
}

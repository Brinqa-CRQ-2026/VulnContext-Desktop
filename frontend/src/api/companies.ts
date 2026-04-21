import { buildApiUrl, parseJsonOrThrow } from "./client";

export interface TopologyMetrics {
  total_business_services: number;
  total_applications: number;
  total_assets: number;
  total_findings: number;
}

export interface Company {
  id: string;
  name: string;
  metrics: TopologyMetrics;
}

export interface BusinessServiceInCompany {
  business_service: string;
  slug: string;
  metrics: TopologyMetrics;
}

export interface BusinessUnitInCompany {
  business_unit: string;
  slug: string;
  metrics: TopologyMetrics;
  business_services: BusinessServiceInCompany[];
}

export interface CompanyFullDetail {
  id: string;
  name: string;
  metrics: TopologyMetrics;
  business_units: BusinessUnitInCompany[];
}

export interface ApplicationInService {
  application: string;
  slug: string;
  metrics: TopologyMetrics;
}

export interface ServiceDetail {
  company: { name: string } | null;
  business_unit: string;
  business_service: string;
  slug: string;
  metrics: TopologyMetrics;
  applications: ApplicationInService[];
  direct_assets: unknown[];
}

export async function fetchCompanies(): Promise<Company[]> {
  const url = buildApiUrl("/topology/companies");
  const res = await fetch(url);
  return parseJsonOrThrow<Company[]>(res, "Failed to fetch companies");
}

export async function fetchCompanyDetail(companyId: string): Promise<CompanyFullDetail> {
  const url = buildApiUrl(`/topology/companies/${encodeURIComponent(companyId)}`);
  const res = await fetch(url);
  return parseJsonOrThrow<CompanyFullDetail>(res, "Failed to fetch company detail");
}

export async function fetchServiceDetail(buSlug: string, serviceSlug: string): Promise<ServiceDetail> {
  const url = buildApiUrl(
    `/topology/business-units/${encodeURIComponent(buSlug)}/business-services/${encodeURIComponent(serviceSlug)}`
  );
  const res = await fetch(url);
  return parseJsonOrThrow<ServiceDetail>(res, "Failed to fetch service detail");
}

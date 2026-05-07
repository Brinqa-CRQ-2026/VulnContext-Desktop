import { useMemo, useState } from "react";

import type { AssetListSortBy, SortOrder } from "../../../types";
import { formatEnvironment } from "../../../lib/assets/assetFormatters";
import { getPaginationWindow } from "../../../lib/pagination/getPaginationWindow";
import type { SortState } from "../../../lib/sorting/sortState";
import { useAssetsAnalytics } from "./useAssetsAnalytics";
import { usePaginatedAssets } from "./usePaginatedAssets";

export function useAssetInventoryState({
  businessUnit,
  businessService,
  application,
  directOnly = false,
  refreshToken,
}: {
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  directOnly?: boolean;
  refreshToken: number;
}) {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [environment, setEnvironment] = useState<string>("All");
  const [compliance, setCompliance] = useState<string>("All");
  const [sortBy, setSortBy] = useState<AssetListSortBy>("finding_count");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const normalizedFilters = {
    status: status === "All" ? null : status,
    environment: environment === "All" ? null : environment,
    compliance: compliance === "All" ? null : compliance,
  };

  const { data, loading, error, page, setPage, pageSize } = usePaginatedAssets({
    pageSize: 10,
    businessUnit,
    businessService,
    application,
    ...normalizedFilters,
    search,
    directOnly,
    sortBy,
    sortOrder,
    refreshToken,
  });
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAssetsAnalytics({
    businessUnit,
    businessService,
    application,
    ...normalizedFilters,
    search,
    directOnly,
    refreshToken,
  });

  const assets = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const pageNumbers = useMemo(
    () => getPaginationWindow({ page, totalPages, windowSize: 2 }),
    [page, totalPages]
  );
  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    assets.forEach((asset) => {
      if (asset.status) values.add(asset.status);
    });
    return ["All", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [assets]);
  const environmentOptions = useMemo(() => {
    const values = new Set<string>();
    assets.forEach((asset) => {
      values.add(formatEnvironment(asset.environment));
    });
    return ["All", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [assets]);
  const complianceOptions = ["All", "Regulated", "PCI", "PII"];
  const sortState: SortState<AssetListSortBy> = {
    key: sortBy,
    order: sortOrder,
  };

  const applySearch = () => {
    setSearch(searchDraft.trim());
  };
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };
  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  return {
    searchDraft,
    setSearchDraft,
    applySearch,
    status,
    setStatus,
    environment,
    setEnvironment,
    compliance,
    setCompliance,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    sortState,
    data,
    assets,
    loading,
    error,
    analytics,
    analyticsLoading,
    analyticsError,
    page,
    pageSize,
    totalPages,
    pageNumbers,
    goToPage,
    statusOptions,
    environmentOptions,
    complianceOptions,
  };
}

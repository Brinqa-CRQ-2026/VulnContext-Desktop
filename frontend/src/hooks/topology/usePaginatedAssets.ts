import { useEffect, useState } from "react";

import { getAssetsPage } from "../../api/topology";
import type {
  AssetListSortBy,
  PaginatedAssets,
  SortOrder,
} from "../../api/types";

export function usePaginatedAssets({
  pageSize = 10,
  businessUnit,
  businessService,
  application,
  status,
  search,
  directOnly = false,
  sortBy = "finding_count",
  sortOrder = "desc",
  refreshToken = 0,
}: {
  pageSize?: number;
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  status?: string | null;
  search?: string | null;
  directOnly?: boolean;
  sortBy?: AssetListSortBy;
  sortOrder?: SortOrder;
  refreshToken?: number;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [businessUnit, businessService, application, status, search, directOnly, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const next = await getAssetsPage({
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
        });
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Failed to load assets.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [
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
    refreshToken,
  ]);

  return {
    page,
    setPage,
    pageSize,
    data,
    loading,
    error,
  };
}

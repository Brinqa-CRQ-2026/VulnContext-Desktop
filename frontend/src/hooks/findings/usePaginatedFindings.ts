import { useEffect, useState } from "react";

import { getAllFindings, getFindingsByRiskBand } from "../../api/findings";
import type {
  FindingsSortBy,
  PaginatedFindings,
  RiskBandFilter,
  SortOrder,
} from "../../api/types";

export function usePaginatedFindings(
  initialPageSize: number = 50,
  bandFilter: RiskBandFilter = "All",
  sortBy: FindingsSortBy = "risk_score",
  sortOrder: SortOrder = "desc",
  sourceFilter: string | null = null,
  refreshToken: number = 0
) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [data, setData] = useState<PaginatedFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [bandFilter, sortBy, sortOrder, sourceFilter]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (bandFilter === "All") {
          const allResult = await getAllFindings(
            page,
            pageSize,
            sortBy,
            sortOrder,
            sourceFilter
          );
          setData(allResult);
          return;
        }

        const filteredResult = await getFindingsByRiskBand(
          bandFilter,
          page,
          pageSize,
          sortBy,
          sortOrder,
          sourceFilter
        );
        setData(filteredResult);
      } catch (err) {
        console.error(err);
        setError("Failed to load findings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [page, pageSize, bandFilter, sortBy, sortOrder, sourceFilter, refreshToken]);

  return {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
  };
}

import { useEffect, useState } from "react";

import { getBusinessUnitFindings } from "../../../api/topology";
import type { FindingsSortBy, PaginatedFindings, SortOrder } from "../../../types";

export function useBusinessUnitTopFindings(
  businessUnitSlug: string | null,
  {
    pageSize = 10,
    sortBy = "risk_score",
    sortOrder = "desc",
    source = null,
    riskBand = null,
    search = null,
    refreshToken = 0,
  }: {
    pageSize?: number;
    sortBy?: FindingsSortBy;
    sortOrder?: SortOrder;
    source?: string | null;
    riskBand?: string | null;
    search?: string | null;
    refreshToken?: number;
  } = {}
) {
  const [data, setData] = useState<PaginatedFindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [businessUnitSlug, pageSize, sortBy, sortOrder, source, riskBand, search]);

  useEffect(() => {
    let active = true;

    async function loadTopFindings() {
      if (!businessUnitSlug) {
        setData(null);
        setError("Business unit findings not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const next = await getBusinessUnitFindings(businessUnitSlug, {
          page,
          pageSize,
          sortBy,
          sortOrder,
          source,
          riskBand,
          search,
        });
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setData(null);
        setError(
          err instanceof Error ? err.message : "Failed to load business unit findings."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTopFindings();
    return () => {
      active = false;
    };
  }, [businessUnitSlug, page, pageSize, sortBy, sortOrder, source, riskBand, search, refreshToken]);

  return { data, loading, error, page, setPage, pageSize };
}

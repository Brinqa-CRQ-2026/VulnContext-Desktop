import { useEffect, useState } from "react";

import { getAssetFindingsPage } from "../../api/topology";
import type {
  AssetFindingsPage,
  FindingsSortBy,
  RiskBandFilter,
  SortOrder,
} from "../../api/types";

export function useAssetFindings(
  assetId: string | null,
  {
    pageSize = 10,
    bandFilter = "All",
    sortBy = "risk_score",
    sortOrder = "desc",
    kevOnly = false,
    source = null,
    search = null,
    refreshToken = 0,
  }: {
    pageSize?: number;
    bandFilter?: RiskBandFilter;
    sortBy?: FindingsSortBy;
    sortOrder?: SortOrder;
    kevOnly?: boolean;
    source?: string | null;
    search?: string | null;
    refreshToken?: number;
  }
) {
  const [assetFindings, setAssetFindings] = useState<AssetFindingsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [assetId, pageSize, bandFilter, sortBy, sortOrder, kevOnly, source, search]);

  useEffect(() => {
    let active = true;

    async function loadAssetFindings() {
      if (!assetId) {
        setAssetFindings(null);
        setError("Asset not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getAssetFindingsPage(assetId, {
          page,
          pageSize,
          sortBy,
          sortOrder,
          riskBand: bandFilter,
          kevOnly,
          source,
          search,
        });
        if (!active) return;
        setAssetFindings(data);
      } catch (err) {
        if (!active) return;
        setAssetFindings(null);
        setError(
          err instanceof Error ? err.message : "Failed to load asset findings."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAssetFindings();
    return () => {
      active = false;
    };
  }, [assetId, page, pageSize, bandFilter, sortBy, sortOrder, kevOnly, source, search, refreshToken]);

  return { assetFindings, loading, error, page, setPage, pageSize };
}

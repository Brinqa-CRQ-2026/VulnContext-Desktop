import { useEffect, useState } from "react";

import { getAssetFindingsAnalytics } from "../../api/topology";
import type {
  AssetFindingsAnalyticsResponse,
  RiskBandFilter,
} from "../../api/types";

export function useAssetFindingsAnalytics(
  assetId: string | null,
  {
    bandFilter = "All",
    kevOnly = false,
    source = null,
    search = null,
    refreshToken = 0,
  }: {
    bandFilter?: RiskBandFilter;
    kevOnly?: boolean;
    source?: string | null;
    search?: string | null;
    refreshToken?: number;
  }
) {
  const [analytics, setAnalytics] = useState<AssetFindingsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!assetId) {
        setAnalytics(null);
        setError("Asset not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const next = await getAssetFindingsAnalytics(assetId, {
          riskBand: bandFilter,
          kevOnly,
          source,
          search,
        });
        if (!active) return;
        setAnalytics(next);
      } catch (err) {
        if (!active) return;
        setAnalytics(null);
        setError(
          err instanceof Error ? err.message : "Failed to load asset findings analytics."
        );
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
  }, [assetId, bandFilter, kevOnly, source, search, refreshToken]);

  return { analytics, loading, error };
}

import { useEffect, useState } from "react";

import { getAssetDetail } from "../../api/topology";
import type { AssetDetail } from "../../api/types";

export function useAssetDetail(assetId: string | null, refreshToken: number) {
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!assetId) {
        setAssetDetail(null);
        setLoading(false);
        setError("Asset not found.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const next = await getAssetDetail(assetId);
        if (!active) return;
        setAssetDetail(next);
      } catch (err) {
        if (!active) return;
        setAssetDetail(null);
        setError(err instanceof Error ? err.message : "Failed to load asset detail.");
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
  }, [assetId, refreshToken]);

  return { assetDetail, loading, error };
}

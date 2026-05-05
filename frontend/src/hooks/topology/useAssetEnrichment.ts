import { useEffect, useState } from "react";

import { getAssetEnrichment } from "../../api/topology";
import type { AssetEnrichment } from "../../api/types";
import { isUiOnlyModeEnabled } from "../../auth/brinqaAuth";
import { requestBrinqaSessionReset } from "../../auth/electronBrinqa";

export function useAssetEnrichment(
  assetId: string | null,
  refreshToken: number,
  { loadOnMount = true }: { loadOnMount?: boolean } = {}
) {
  const [enrichment, setEnrichment] = useState<AssetEnrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnrichment(null);
    setLoading(false);
    setError(null);
  }, [assetId, refreshToken]);

  async function run() {
    if (!assetId) {
      setEnrichment(null);
      setError("Asset not found.");
      setLoading(false);
      return;
    }

    if (isUiOnlyModeEnabled()) {
      setEnrichment(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const next = await getAssetEnrichment(assetId);
      setEnrichment(next);
      if (next.status === "unauthorized_token") {
        void requestBrinqaSessionReset({
          reason: "unauthorized",
          reopenLogin: true,
          includeRemoteLogout: true,
        });
      }
    } catch (err) {
      setEnrichment(null);
      setError(err instanceof Error ? err.message : "Failed to load asset enrichment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadOnMount) {
      return;
    }
    void run();
  }, [assetId, refreshToken, loadOnMount]);

  return { enrichment, loading, error, run };
}

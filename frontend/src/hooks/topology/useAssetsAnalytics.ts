import { useEffect, useState } from "react";

import { getAssetsAnalytics } from "../../api/topology";
import type { AssetAnalyticsResponse } from "../../api/types";

export function useAssetsAnalytics({
  businessUnit,
  businessService,
  application,
  status,
  environment,
  compliance,
  search,
  directOnly = false,
  refreshToken = 0,
}: {
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  status?: string | null;
  environment?: string | null;
  compliance?: string | null;
  search?: string | null;
  directOnly?: boolean;
  refreshToken?: number;
}) {
  const [analytics, setAnalytics] = useState<AssetAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const next = await getAssetsAnalytics({
          businessUnit,
          businessService,
          application,
          status,
          environment,
          compliance,
          search,
          directOnly,
        });
        if (!active) return;
        setAnalytics(next);
      } catch (err) {
        if (!active) return;
        setAnalytics(null);
        setError(
          err instanceof Error ? err.message : "Failed to load asset analytics."
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
  }, [
    businessUnit,
    businessService,
    application,
    status,
    environment,
    compliance,
    search,
    directOnly,
    refreshToken,
  ]);

  return { analytics, loading, error };
}

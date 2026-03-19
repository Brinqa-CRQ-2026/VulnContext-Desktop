import { useEffect, useState } from "react";

import { getRiskWeights } from "../../api/risk-weights";
import type { RiskWeightsConfig } from "../../api/types";

export function useRiskWeightsConfig(refreshToken: number) {
  const [weights, setWeights] = useState<RiskWeightsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const current = await getRiskWeights();
        setWeights(current);
      } catch (err) {
        console.error(err);
        setError("Failed to load risk weights.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [refreshToken]);

  return { weights, setWeights, loading, error };
}

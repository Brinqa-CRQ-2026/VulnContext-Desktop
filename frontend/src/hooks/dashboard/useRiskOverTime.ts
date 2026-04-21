import { useEffect, useState } from "react";

import { getRiskOverTime } from "../../api/findings";
import type { RiskOverTimeResponse } from "../../api/types";

export function useRiskOverTime(days: number = 30) {
  const [data, setData] = useState<RiskOverTimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await getRiskOverTime(days);
        if (!isActive) return;
        setData(response);
      } catch (err) {
        console.error(err);
        if (!isActive) return;
        setError("Failed to load risk over time data.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [days]);

  return { data, loading, error };
}

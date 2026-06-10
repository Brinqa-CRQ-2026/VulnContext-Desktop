import { useEffect, useState } from "react";

import { getScoresSummary } from "../../api/findings";
import type { ScoresSummary } from "../../types";

export function useDashboardOverviewData(refreshToken: number) {
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const summaryData = await getScoresSummary();
        if (!isActive) return;
        setSummary(summaryData);
      } catch (err) {
        console.error(err);
        if (!isActive) return;
        setError("Failed to load dashboard metrics.");
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
  }, [refreshToken]);

  return { summary, loading, error };
}

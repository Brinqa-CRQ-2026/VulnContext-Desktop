import { useEffect, useState } from "react";

import { getScoresSummary } from "../../api/findings";
import { getSourcesSummary } from "../../api/sources";
import type { ScoresSummary, SourceSummary } from "../../api/types";

export function useDashboardOverviewData(refreshToken: number) {
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, sourceData] = await Promise.all([
          getScoresSummary(),
          getSourcesSummary(),
        ]);
        if (!isActive) return;
        setSummary(summaryData);
        setSources(sourceData);
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

  return { summary, sources, loading, error };
}

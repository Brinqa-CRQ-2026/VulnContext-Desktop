import { useEffect, useState } from "react";

import { getSourcesSummary } from "../../api/sources";
import type { SourceSummary } from "../../api/types";

export function useSourcesSummary(refreshToken: number) {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSources() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSourcesSummary();
        if (!isActive) return;
        setSources(data);
      } catch (err) {
        console.error(err);
        if (!isActive) return;
        setError("Failed to load sources.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadSources();
    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  return { sources, setSources, loading, error };
}

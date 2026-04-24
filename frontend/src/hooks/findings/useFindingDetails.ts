import { useEffect, useState } from "react";

import { getFindingById } from "../../api/findings";
import type { ScoredFinding } from "../../api/types";

export function useFindingDetails(findingId: string, refreshToken: number) {
  const [finding, setFinding] = useState<ScoredFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFinding() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFindingById(findingId);
        if (!active) return;
        setFinding(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load finding.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFinding();
    return () => {
      active = false;
    };
  }, [findingId, refreshToken]);

  return { finding, setFinding, loading, error };
}

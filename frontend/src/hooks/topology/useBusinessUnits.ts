import { useEffect, useState } from "react";

import { getBusinessUnits } from "../../api/topology";
import type { BusinessUnitSummary } from "../../api/types";

export function useBusinessUnits(refreshToken: number) {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBusinessUnits() {
      try {
        setLoading(true);
        setError(null);
        const data = await getBusinessUnits();
        if (!active) return;
        setBusinessUnits(data);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load business units."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBusinessUnits();
    return () => {
      active = false;
    };
  }, [refreshToken]);

  return { businessUnits, loading, error };
}

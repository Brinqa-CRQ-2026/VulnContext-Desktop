import { useEffect, useState } from "react";

import { getBusinessUnitRiskOverview } from "../../../api/topology";
import type { BusinessUnitRiskOverview } from "../../../types";

export function useBusinessUnitRiskOverview(
  businessUnitSlug: string | null,
  refreshToken: number
) {
  const [riskOverview, setRiskOverview] = useState<BusinessUnitRiskOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRiskOverview() {
      if (!businessUnitSlug) {
        setRiskOverview(null);
        setError("Business unit risk overview not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getBusinessUnitRiskOverview(businessUnitSlug);
        if (!active) return;
        setRiskOverview(data);
      } catch (err) {
        if (!active) return;
        setRiskOverview(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load business unit risk overview."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRiskOverview();
    return () => {
      active = false;
    };
  }, [businessUnitSlug, refreshToken]);

  return { riskOverview, loading, error };
}

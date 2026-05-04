import { useEffect, useState } from "react";

import { getBusinessServiceAnalytics } from "../../api/topology";
import type { BusinessServiceAnalytics } from "../../api/types";

export function useBusinessServiceAnalytics(
  businessUnitSlug: string | null,
  businessServiceSlug: string | null,
  refreshToken: number
) {
  const [analytics, setAnalytics] = useState<BusinessServiceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      if (!businessUnitSlug || !businessServiceSlug) {
        setAnalytics(null);
        setError("Business service analytics not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getBusinessServiceAnalytics(
          businessUnitSlug,
          businessServiceSlug
        );
        if (!active) return;
        setAnalytics(data);
      } catch (err) {
        if (!active) return;
        setAnalytics(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load business service analytics."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [businessUnitSlug, businessServiceSlug, refreshToken]);

  return { analytics, loading, error };
}

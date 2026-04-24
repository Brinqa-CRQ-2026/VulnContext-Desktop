import { useEffect, useState } from "react";

import { getBusinessServiceDetail } from "../../api/topology";
import type { BusinessServiceDetail } from "../../api/types";

export function useBusinessServiceDetail(
  businessUnitSlug: string | null,
  businessServiceSlug: string | null,
  refreshToken: number
) {
  const [businessService, setBusinessService] =
    useState<BusinessServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBusinessService() {
      if (!businessUnitSlug || !businessServiceSlug) {
        setBusinessService(null);
        setError("Business service not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getBusinessServiceDetail(
          businessUnitSlug,
          businessServiceSlug
        );
        if (!active) return;
        setBusinessService(data);
      } catch (err) {
        if (!active) return;
        setBusinessService(null);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load business service detail."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBusinessService();
    return () => {
      active = false;
    };
  }, [businessUnitSlug, businessServiceSlug, refreshToken]);

  return { businessService, loading, error };
}

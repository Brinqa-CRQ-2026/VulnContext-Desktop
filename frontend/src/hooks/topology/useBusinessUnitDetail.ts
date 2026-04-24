import { useEffect, useState } from "react";

import { getBusinessUnitDetail } from "../../api/topology";
import type { BusinessUnitDetail } from "../../api/types";

export function useBusinessUnitDetail(
  businessUnitSlug: string | null,
  refreshToken: number
) {
  const [businessUnit, setBusinessUnit] = useState<BusinessUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBusinessUnit() {
      if (!businessUnitSlug) {
        setBusinessUnit(null);
        setError("Business unit not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getBusinessUnitDetail(businessUnitSlug);
        if (!active) return;
        setBusinessUnit(data);
      } catch (err) {
        if (!active) return;
        setBusinessUnit(null);
        setError(
          err instanceof Error ? err.message : "Failed to load business unit detail."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBusinessUnit();
    return () => {
      active = false;
    };
  }, [businessUnitSlug, refreshToken]);

  return { businessUnit, loading, error };
}

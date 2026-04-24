import { useEffect, useState } from "react";

import { getApplicationDetail } from "../../api/topology";
import type { ApplicationDetail } from "../../api/types";

export function useApplicationDetail(
  businessUnitSlug: string | null,
  businessServiceSlug: string | null,
  applicationSlug: string | null,
  refreshToken: number
) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      if (!businessUnitSlug || !businessServiceSlug || !applicationSlug) {
        setApplication(null);
        setError("Application not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getApplicationDetail(
          businessUnitSlug,
          businessServiceSlug,
          applicationSlug
        );
        if (!active) return;
        setApplication(data);
      } catch (err) {
        if (!active) return;
        setApplication(null);
        setError(
          err instanceof Error ? err.message : "Failed to load application detail."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplication();
    return () => {
      active = false;
    };
  }, [applicationSlug, businessServiceSlug, businessUnitSlug, refreshToken]);

  return { application, loading, error };
}

import { useBusinessUnitOverview } from "./useBusinessUnitOverview";

export function useBusinessServicesByBusinessUnit(
  businessUnitSlug: string | null,
  refreshToken: number
) {
  const { businessUnit, loading, error } = useBusinessUnitOverview(
    businessUnitSlug,
    refreshToken
  );

  return {
    businessServices: businessUnit?.business_services ?? [],
    businessUnit,
    loading,
    error,
  };
}

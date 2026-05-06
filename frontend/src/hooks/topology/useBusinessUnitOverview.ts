import { useBusinessUnitDetail } from "./useBusinessUnitDetail";

export function useBusinessUnitOverview(
  businessUnitSlug: string | null,
  refreshToken: number
) {
  return useBusinessUnitDetail(businessUnitSlug, refreshToken);
}

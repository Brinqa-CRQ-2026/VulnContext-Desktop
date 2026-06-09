import { useDashboardOverviewData } from "../../hooks/dashboard/useDashboardOverviewData";
import { LoadingSpinnerState } from "../shared/LoadingSpinnerState";
import { RiskBandDistributionChart } from "./RiskBandDistributionChart";
import { SummaryCards } from "./SummaryCards";

interface DashboardOverviewProps {
  refreshToken: number;
}

export function DashboardOverview({ refreshToken }: DashboardOverviewProps) {
  const { summary, sources, loading, error } = useDashboardOverviewData(refreshToken);

  return (
    <section className="space-y-4">
      {loading ? (
        <LoadingSpinnerState message="Loading findings overview" />
      ) : (
        <>
          <SummaryCards summary={summary} sources={sources} loading={loading} />
          <RiskBandDistributionChart summary={summary} loading={loading} />
        </>
      )}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

import { DashboardOverview } from "../../components/dashboard/DashboardOverview";
import { FindingDetailPage } from "../../components/dashboard/FindingDetailPage";
import { RiskTable } from "../../components/dashboard/RiskTable";
import type { BreadcrumbEntry } from "../../components/topology/TopologyChrome";
import type { AppRoute, BasePage } from "../../routing/appRoutes";
import type { FindingRouteOrigin, ScoredFinding } from "../../types";

export function FindingsRoutePage({
  route,
  refreshToken,
  findingBreadcrumbs,
  findingBackLabel,
  onFindingBack,
  onDataChanged,
  onNavigate,
  onOpenFinding,
}: {
  route: AppRoute;
  refreshToken: number;
  findingBreadcrumbs: BreadcrumbEntry[];
  findingBackLabel: string;
  onFindingBack: () => void;
  onDataChanged: () => void;
  onNavigate: (page: BasePage) => void;
  onOpenFinding: (finding: ScoredFinding, origin?: FindingRouteOrigin | null) => void;
}) {
  if (route.findingId) {
    return (
      <FindingDetailPage
        findingId={route.findingId}
        refreshToken={refreshToken}
        origin={route.findingOrigin}
        breadcrumbs={findingBreadcrumbs}
        backLabel={findingBackLabel}
        onBack={onFindingBack}
        onDataChanged={onDataChanged}
      />
    );
  }

  return (
    <>
      <DashboardOverview refreshToken={refreshToken} />
      <RiskTable
        refreshToken={refreshToken}
        onOpenIntegrations={() => onNavigate("integrations")}
        onOpenFinding={onOpenFinding}
      />
    </>
  );
}

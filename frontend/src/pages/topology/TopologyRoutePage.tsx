import type {
  ApplicationSummary,
  AssetSummary,
  BusinessServiceSummary,
  BusinessUnitSummary,
  FindingRouteOrigin,
  ScoredFinding,
} from "../../types";
import { getEmptyRoute, type AppRoute } from "../../routing/appRoutes";
import { getRouteViewState, type RouteViewState } from "../../routing/pageMeta";
import { ApplicationDetailPage } from "./ApplicationDetailPage";
import { AssetFindingsPage } from "./AssetFindingsPage";
import { BusinessServiceDetailPage } from "./BusinessServiceDetailPage";
import { BusinessUnitDetailPage } from "./BusinessUnitDetailPage";
import { TopologyOverviewPage } from "./TopologyOverviewPage";

export function TopologyRoutePage({
  route,
  refreshToken,
  viewState = getRouteViewState(route),
  onNavigateOverview,
  onUpdateRoute,
  onOpenFinding,
}: {
  route: AppRoute;
  refreshToken: number;
  viewState?: RouteViewState;
  onNavigateOverview: () => void;
  onUpdateRoute: (route: AppRoute) => void;
  onOpenFinding: (finding: ScoredFinding, origin?: FindingRouteOrigin | null) => void;
}) {
  const openBusinessUnit = (businessUnit: BusinessUnitSummary) => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: businessUnit.slug,
    });
  };

  const openBusinessService = (businessService: BusinessServiceSummary) => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: businessService.slug,
    });
  };

  const openApplication = (application: ApplicationSummary) => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: application.slug,
    });
  };

  const openAssetFindings = (asset: AssetSummary) => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: route.applicationSlug,
      assetId: asset.asset_id,
    });
  };

  const openBusinessUnitRoute = () => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
    });
  };

  const openBusinessServiceRoute = () => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
    });
  };

  const openApplicationRoute = () => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: route.applicationSlug,
    });
  };

  const handleApplicationBack = () => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: null,
    });
  };

  const handleAssetBack = () => {
    onUpdateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: route.applicationSlug,
      assetId: null,
    });
  };

  if (viewState.inAssetFindings) {
    return (
      <AssetFindingsPage
        businessUnitSlug={route.businessUnitSlug}
        businessServiceSlug={route.businessServiceSlug}
        applicationSlug={route.applicationSlug}
        assetId={route.assetId}
        refreshToken={refreshToken}
        onBack={handleAssetBack}
        onOpenOverview={onNavigateOverview}
        onOpenBusinessUnit={openBusinessUnitRoute}
        onOpenBusinessService={openBusinessServiceRoute}
        onOpenApplication={route.applicationSlug ? openApplicationRoute : undefined}
        onOpenFinding={onOpenFinding}
      />
    );
  }

  if (viewState.inApplicationDetail) {
    return (
      <ApplicationDetailPage
        businessUnitSlug={route.businessUnitSlug}
        businessServiceSlug={route.businessServiceSlug}
        applicationSlug={route.applicationSlug}
        refreshToken={refreshToken}
        onBack={handleApplicationBack}
        onOpenOverview={onNavigateOverview}
        onOpenBusinessUnit={openBusinessUnitRoute}
        onOpenBusinessService={openBusinessServiceRoute}
        onOpenAssetFindings={openAssetFindings}
      />
    );
  }

  if (viewState.inBusinessServiceDetail) {
    return (
      <BusinessServiceDetailPage
        businessUnitSlug={route.businessUnitSlug}
        businessServiceSlug={route.businessServiceSlug}
        refreshToken={refreshToken}
        onBack={openBusinessUnitRoute}
        onOpenOverview={onNavigateOverview}
        onOpenBusinessUnit={openBusinessUnitRoute}
        onOpenApplication={openApplication}
        onOpenAssetFindings={openAssetFindings}
      />
    );
  }

  if (viewState.inBusinessUnitDetail) {
    return (
      <BusinessUnitDetailPage
        businessUnitSlug={route.businessUnitSlug}
        refreshToken={refreshToken}
        onBack={onNavigateOverview}
        onOpenOverview={onNavigateOverview}
        onOpenBusinessService={openBusinessService}
        onOpenFinding={onOpenFinding}
      />
    );
  }

  return (
    <TopologyOverviewPage
      refreshToken={refreshToken}
      onOpenBusinessUnit={openBusinessUnit}
    />
  );
}

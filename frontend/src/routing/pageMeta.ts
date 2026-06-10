import type { AppRoute } from "./appRoutes";

export type RouteViewState = ReturnType<typeof getRouteViewState>;

export function getRouteViewState(route: AppRoute) {
  const page = route.page;
  const inFindingDetail = page === "findings" && route.findingId !== null;
  const inAssetFindings =
    page === "business-services" && route.assetId !== null && route.businessUnitSlug !== null;
  const inApplicationDetail =
    page === "business-services" &&
    route.businessUnitSlug !== null &&
    route.businessServiceSlug !== null &&
    route.applicationSlug !== null &&
    route.assetId === null;
  const inBusinessServiceDetail =
    page === "business-services" &&
    route.businessUnitSlug !== null &&
    route.businessServiceSlug !== null &&
    route.applicationSlug === null &&
    route.assetId === null;
  const inBusinessUnitDetail =
    page === "business-services" &&
    route.businessUnitSlug !== null &&
    route.businessServiceSlug === null;

  return {
    inFindingDetail,
    inAssetFindings,
    inApplicationDetail,
    inBusinessServiceDetail,
    inBusinessUnitDetail,
  };
}

export function getPageMeta(route: AppRoute, viewState = getRouteViewState(route)) {
  return {
    findings: {
      title: viewState.inFindingDetail ? "Finding" : "Organization Findings",
      description: viewState.inFindingDetail
        ? "Finding risk scope showing vulnerability context, severity, exploit signals, affected assets, and remediation guidance."
        : "A centralized view of all vulnerability findings across business services, applications, and assets to support remediation prioritization.",
    },
    integrations: {
      title: "Sources",
      description: "Review imported sources and the number of findings stored for each.",
    },
    controls: {
      title: "Security Score",
      description:
        "Capture concise security maturity answers and map them into FAIR-aligned scoring context.",
    },
    "business-services": {
      title: viewState.inAssetFindings
        ? "Asset"
        : viewState.inApplicationDetail
          ? "Application"
          : viewState.inBusinessServiceDetail
            ? "Business Service"
            : viewState.inBusinessUnitDetail
              ? "Business Unit"
              : "Company",
      description: viewState.inAssetFindings
        ? "Asset risk scope showing asset criticality, FAIR frequency context, and all findings attached to the selected asset."
        : viewState.inApplicationDetail
          ? "Application risk scope showing attached assets, asset criticality, finding risk spread, and related risk drivers."
          : viewState.inBusinessServiceDetail
            ? "Business service risk scope showing applications, direct assets, FAIR loss exposure, and finding-driven risk."
            : viewState.inBusinessUnitDetail
              ? "Business-unit risk scope showing service inventory, finding distribution, and quantified risk across this part of the topology."
              : "Company-level topology overview showing business units, services, applications, assets, findings, and risk distribution across the organization.",
    },
  } as const;
}

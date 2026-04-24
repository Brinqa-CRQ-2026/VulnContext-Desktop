import { useEffect, useState } from "react";
import { BriefcaseBusiness, ListFilter, PlugZap } from "lucide-react";
import { Header } from "./components/layout/Header";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { RiskTable } from "./components/dashboard/RiskTable";
import { RiskWeightsEditor } from "./components/dashboard/RiskWeightsEditor";
import { FindingDetailPage } from "./components/dashboard/FindingDetailPage";
import { IntegrationsPage } from "./components/integrations/IntegrationsPage";
import { ApplicationDetailPage } from "./components/business-services/ApplicationDetailPage";
import { AssetFindingsPage } from "./components/business-services/AssetFindingsPage";
import { BusinessServiceDetailPage } from "./components/business-services/BusinessServiceDetailPage";
import { BusinessUnitDetailPage } from "./components/business-services/BusinessUnitDetailPage";
import { BusinessServicesOverview } from "./components/business-services/BusinessServicesOverview";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import type {
  ApplicationSummary,
  AssetSummary,
  BusinessServiceSummary,
  BusinessUnitSummary,
  FindingRouteOrigin,
  ScoredFinding,
} from "./api";
import { formatSlugLabel } from "./components/business-services/TopologyChrome";

type BasePage = "findings" | "integrations" | "business-services";
type AppRoute = {
  page: BasePage;
  findingId: string | null;
  findingOrigin: FindingRouteOrigin | null;
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  applicationSlug: string | null;
  assetId: string | null;
};

function getEmptyRoute(page: BasePage): AppRoute {
  return {
    page,
    findingId: null,
    findingOrigin: null,
    businessUnitSlug: null,
    businessServiceSlug: null,
    applicationSlug: null,
    assetId: null,
  };
}

function readHistoryFindingOrigin(): FindingRouteOrigin | null {
  const state = window.history.state;
  if (!state || typeof state !== "object" || !("findingOrigin" in state)) {
    return null;
  }

  const origin = (state as { findingOrigin?: unknown }).findingOrigin;
  if (!origin || typeof origin !== "object") {
    return null;
  }

  const mode = (origin as { mode?: unknown }).mode;
  if (mode !== "global" && mode !== "asset") {
    return null;
  }

  return origin as FindingRouteOrigin;
}

function parsePathRoute(pathname: string): AppRoute | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return getEmptyRoute("business-services");
  }

  if (parts[0] === "business-services") {
    const baseRoute = getEmptyRoute("business-services");

    if (parts.length === 1) {
      return baseRoute;
    }
    if (parts.length === 2) {
      return { ...baseRoute, businessUnitSlug: parts[1] };
    }
    if (parts.length === 3) {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
      };
    }
    if (parts.length === 6 && parts[3] === "assets" && parts[5] === "findings") {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        assetId: parts[4],
      };
    }
    if (parts.length === 4) {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        applicationSlug: parts[3],
      };
    }
    if (parts.length === 7 && parts[4] === "assets" && parts[6] === "findings") {
      return {
        ...baseRoute,
        businessUnitSlug: parts[1],
        businessServiceSlug: parts[2],
        applicationSlug: parts[3],
        assetId: parts[5],
      };
    }
  }

  return null;
}

function parseHashRoute(): AppRoute {
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash) {
    return parsePathRoute(window.location.pathname) ?? getEmptyRoute("business-services");
  }
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "findings") {
    const id = parts[1]?.trim() || null;
    return {
      ...getEmptyRoute("findings"),
      findingId: id,
      findingOrigin: readHistoryFindingOrigin(),
    };
  }
  if (parts[0] === "integrations") {
    return getEmptyRoute("integrations");
  }
  return parsePathRoute(`/${hash}`) ?? getEmptyRoute("findings");
}

function writeHashRoute(route: AppRoute) {
  const useHttpPathRouting =
    window.location.protocol.startsWith("http") && route.page === "business-services";
  const nextUrl = (() => {
    if (useHttpPathRouting) {
      const segments = ["business-services"];
      if (route.businessUnitSlug) {
        segments.push(route.businessUnitSlug);
      }
      if (route.businessServiceSlug) {
        segments.push(route.businessServiceSlug);
      }
      if (route.applicationSlug) {
        segments.push(route.applicationSlug);
      }
      if (route.assetId) {
        segments.push("assets", route.assetId, "findings");
      }
      return `/${segments.join("/")}`;
    }

    if (route.page === "findings" && route.findingId) {
      return `#/findings/${route.findingId}`;
    }
    if (route.page === "findings") {
      return "#/findings";
    }
    if (route.page === "integrations") {
      return "#/integrations";
    }
    if (route.page === "business-services") {
      const segments = ["business-services"];
      if (route.businessUnitSlug) {
        segments.push(route.businessUnitSlug);
      }
      if (route.businessServiceSlug) {
        segments.push(route.businessServiceSlug);
      }
      if (route.applicationSlug) {
        segments.push(route.applicationSlug);
      }
      if (route.assetId) {
        segments.push("assets", route.assetId, "findings");
      }
      return `#/${segments.join("/")}`;
    }
    return "#/findings";
  })();

  const currentUrl = useHttpPathRouting
    ? window.location.pathname
    : window.location.hash || "";
  if (currentUrl !== nextUrl) {
    window.history.pushState(route, "", nextUrl);
  }
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!window.location.hash && !parsePathRoute(window.location.pathname)) {
      writeHashRoute(getEmptyRoute("business-services"));
    }
    const onHashChange = () => setRoute(parseHashRoute());
    const onPopState = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    onHashChange();
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const handleDataChanged = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const updateRoute = (nextRoute: AppRoute) => {
    writeHashRoute(nextRoute);
    setRoute(nextRoute);
  };

  const navigateTo = (page: BasePage) => {
    updateRoute(getEmptyRoute(page));
  };

  const openFinding = (
    finding: ScoredFinding,
    origin: FindingRouteOrigin | null = { mode: "global" }
  ) => {
    const nextRoute = {
      ...getEmptyRoute("findings"),
      findingId: finding.id,
      findingOrigin: origin,
    } as AppRoute;
    updateRoute(nextRoute);
  };

  const openBusinessUnit = (businessUnit: BusinessUnitSummary) => {
    const nextRoute = {
      ...getEmptyRoute("business-services"),
      businessUnitSlug: businessUnit.slug,
    } as AppRoute;
    updateRoute(nextRoute);
  };

  const openBusinessService = (businessService: BusinessServiceSummary) => {
    const nextRoute = {
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: businessService.slug,
    } as AppRoute;
    updateRoute(nextRoute);
  };

  const openApplication = (application: ApplicationSummary) => {
    const nextRoute = {
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: application.slug,
    } as AppRoute;
    updateRoute(nextRoute);
  };

  const openAssetFindings = (asset: AssetSummary) => {
    const nextRoute = {
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: route.applicationSlug,
      assetId: asset.asset_id,
    } as AppRoute;
    updateRoute(nextRoute);
  };

  const findingBackLabel =
    route.findingOrigin?.mode === "asset" ? "Back to Asset Findings" : "Back to Findings";
  const findingBreadcrumbs =
    route.findingOrigin?.mode === "asset"
      ? [
          { label: "Business Units", onClick: () => navigateTo("business-services") },
          {
            label: route.findingOrigin.businessUnitLabel
              ?? formatSlugLabel(route.findingOrigin.businessUnitSlug ?? null, "Business Unit"),
            onClick: () =>
              updateRoute({
                ...getEmptyRoute("business-services"),
                businessUnitSlug: route.findingOrigin?.businessUnitSlug ?? null,
              }),
          },
          {
            label: route.findingOrigin.businessServiceLabel
              ?? formatSlugLabel(
                route.findingOrigin.businessServiceSlug ?? null,
                "Business Service"
              ),
            onClick: () =>
              updateRoute({
                ...getEmptyRoute("business-services"),
                businessUnitSlug: route.findingOrigin?.businessUnitSlug ?? null,
                businessServiceSlug: route.findingOrigin?.businessServiceSlug ?? null,
              }),
          },
          ...(route.findingOrigin.applicationSlug
            ? [
                {
                  label: route.findingOrigin.applicationLabel
                    ?? formatSlugLabel(route.findingOrigin.applicationSlug, "Application"),
                  onClick: () =>
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.findingOrigin?.businessUnitSlug ?? null,
                      businessServiceSlug: route.findingOrigin?.businessServiceSlug ?? null,
                      applicationSlug: route.findingOrigin?.applicationSlug ?? null,
                    }),
                },
              ]
            : []),
          {
            label:
              route.findingOrigin.assetLabel
              ?? route.findingOrigin.assetId
              ?? "Asset Findings",
            onClick: () =>
              updateRoute({
                ...getEmptyRoute("business-services"),
                businessUnitSlug: route.findingOrigin?.businessUnitSlug ?? null,
                businessServiceSlug: route.findingOrigin?.businessServiceSlug ?? null,
                applicationSlug: route.findingOrigin?.applicationSlug ?? null,
                assetId: route.findingOrigin?.assetId ?? null,
              }),
          },
          { label: "Finding" },
        ]
      : [
          { label: "Findings", onClick: () => navigateTo("findings") },
          { label: "Finding" },
        ];

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

  const pageMeta = {
    findings: {
      title: inFindingDetail ? "Finding Details" : "Findings",
      description: inFindingDetail
        ? `Detailed view for finding row #${route.findingId}`
        : "Review, filter, and tune scoring for vulnerability triage workflows.",
    },
    integrations: {
      title: "Sources",
      description: "Review imported sources and the number of findings stored for each.",
    },
    "business-services": {
      title: inAssetFindings
        ? "Asset Findings"
        : inApplicationDetail
          ? "Application Detail"
          : inBusinessServiceDetail
            ? "Business Service Detail"
            : inBusinessUnitDetail
              ? "Business Unit Detail"
              : "Business Unit Overview",
      description: inAssetFindings
        ? "Read-only drill-down for all findings attached to the selected asset."
        : inApplicationDetail
          ? "Assets directly attached to the selected application."
          : inBusinessServiceDetail
            ? "Applications and direct assets under the selected business service."
            : inBusinessUnitDetail
              ? "Business services and current counts for the selected business unit."
              : "Live topology landing page using business units as the top-level entry point.",
    },
  } as const;

  const navItems: Array<{
    id: "findings" | "integrations" | "business-services";
    label: string;
    icon: typeof ListFilter;
  }> = [
    { id: "business-services", label: "Business Services", icon: BriefcaseBusiness },
    { id: "findings", label: "Findings", icon: ListFilter },
    { id: "integrations", label: "Sources", icon: PlugZap },
  ];

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-100 text-slate-900">
      <Header page={page} onNavigate={navigateTo} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-neutral-100 p-3 md:block">
          <div className="mb-3 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "h-10 w-full justify-start gap-2 rounded-lg border border-transparent px-3 text-sm font-medium shadow-none",
                    active
                      ? "bg-slate-950 text-white hover:bg-slate-950 hover:text-white"
                      : "text-slate-700 hover:bg-white hover:text-slate-900"
                  )}
                  onClick={() => navigateTo(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-auto bg-white">
          <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-4 md:px-6">
            <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-none">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {pageMeta[page].title}
              </h1>
              {pageMeta[page].description ? (
                <p className="mt-1 text-sm text-slate-500">{pageMeta[page].description}</p>
              ) : null}
            </section>

            {page === "findings" ? (
              inFindingDetail && route.findingId ? (
                <FindingDetailPage
                  findingId={route.findingId}
                  refreshToken={refreshToken}
                  origin={route.findingOrigin}
                  breadcrumbs={findingBreadcrumbs}
                  backLabel={findingBackLabel}
                  onBack={() => {
                    if (route.findingOrigin?.mode === "asset") {
                      updateRoute({
                        ...getEmptyRoute("business-services"),
                        businessUnitSlug: route.findingOrigin.businessUnitSlug ?? null,
                        businessServiceSlug: route.findingOrigin.businessServiceSlug ?? null,
                        applicationSlug: route.findingOrigin.applicationSlug ?? null,
                        assetId: route.findingOrigin.assetId ?? null,
                      });
                      return;
                    }
                    navigateTo("findings");
                  }}
                  onDataChanged={handleDataChanged}
                />
              ) : (
                <>
                  <DashboardOverview refreshToken={refreshToken} />
                  <RiskWeightsEditor
                    refreshToken={refreshToken}
                    onWeightsUpdated={handleDataChanged}
                  />
                  <RiskTable
                    refreshToken={refreshToken}
                    onOpenIntegrations={() => navigateTo("integrations")}
                    onDataChanged={handleDataChanged}
                    onOpenFinding={openFinding}
                  />
                </>
              )
            ) : page === "business-services" ? (
              inAssetFindings ? (
                <AssetFindingsPage
                  businessUnitSlug={route.businessUnitSlug}
                  businessServiceSlug={route.businessServiceSlug}
                  applicationSlug={route.applicationSlug}
                  assetId={route.assetId}
                  refreshToken={refreshToken}
                  onBack={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                      businessServiceSlug: route.businessServiceSlug,
                      applicationSlug: route.applicationSlug,
                      assetId: null,
                    });
                  }}
                  onOpenOverview={() => navigateTo("business-services")}
                  onOpenBusinessUnit={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                    });
                  }}
                  onOpenBusinessService={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                      businessServiceSlug: route.businessServiceSlug,
                    });
                  }}
                  onOpenApplication={
                    route.applicationSlug
                      ? () => {
                          updateRoute({
                            ...getEmptyRoute("business-services"),
                            businessUnitSlug: route.businessUnitSlug,
                            businessServiceSlug: route.businessServiceSlug,
                            applicationSlug: route.applicationSlug,
                          });
                        }
                      : undefined
                  }
                  onOpenFinding={openFinding}
                />
              ) : inApplicationDetail ? (
                <ApplicationDetailPage
                  businessUnitSlug={route.businessUnitSlug}
                  businessServiceSlug={route.businessServiceSlug}
                  applicationSlug={route.applicationSlug}
                  refreshToken={refreshToken}
                  onBack={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                      businessServiceSlug: route.businessServiceSlug,
                      applicationSlug: null,
                    });
                  }}
                  onOpenOverview={() => navigateTo("business-services")}
                  onOpenBusinessUnit={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                    });
                  }}
                  onOpenBusinessService={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                      businessServiceSlug: route.businessServiceSlug,
                    });
                  }}
                  onOpenAssetFindings={openAssetFindings}
                />
              ) : inBusinessServiceDetail ? (
                <BusinessServiceDetailPage
                  businessUnitSlug={route.businessUnitSlug}
                  businessServiceSlug={route.businessServiceSlug}
                  refreshToken={refreshToken}
                  onBack={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                    });
                  }}
                  onOpenOverview={() => navigateTo("business-services")}
                  onOpenBusinessUnit={() => {
                    updateRoute({
                      ...getEmptyRoute("business-services"),
                      businessUnitSlug: route.businessUnitSlug,
                    });
                  }}
                  onOpenApplication={openApplication}
                  onOpenAssetFindings={openAssetFindings}
                />
              ) : inBusinessUnitDetail ? (
                <BusinessUnitDetailPage
                  businessUnitSlug={route.businessUnitSlug}
                  refreshToken={refreshToken}
                  onBack={() => navigateTo("business-services")}
                  onOpenOverview={() => navigateTo("business-services")}
                  onOpenBusinessService={openBusinessService}
                />
              ) : (
                <BusinessServicesOverview
                  refreshToken={refreshToken}
                  onOpenBusinessUnit={openBusinessUnit}
                />
              )
            ) : (
              <>
                <IntegrationsPage
                  refreshToken={refreshToken}
                  onDataChanged={handleDataChanged}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

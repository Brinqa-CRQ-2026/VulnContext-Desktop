import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Header } from "./components/layout/Header";
import { IntegrationsPage } from "./components/integrations/IntegrationsPage";
import { SecurityScorePage } from "./components/controls/SecurityScorePage";
import { PageIntro } from "./components/topology/shared/PageIntro";
import { formatSlugLabel } from "./components/topology/TopologyChrome";
import { Button } from "./components/ui/button";
import { FindingsRoutePage } from "./pages/findings/FindingsRoutePage";
import { AppSidebar } from "./pages/shell/AppSidebar";
import { TopologyRoutePage } from "./pages/topology/TopologyRoutePage";
import { requestDesktopShutdown } from "./runtime/desktopBridge";
import {
  getEmptyRoute,
  parseHashRoute,
  parsePathRoute,
  writeHashRoute,
  type AppRoute,
  type BasePage,
} from "./routing/appRoutes";
import { getPageMeta, getRouteViewState } from "./routing/pageMeta";
import type { FindingRouteOrigin, ScoredFinding } from "./types";

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [refreshToken, setRefreshToken] = useState(0);
  const [shutdownPending, setShutdownPending] = useState(false);

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

  const updateRoute = (nextRoute: AppRoute) => {
    writeHashRoute(nextRoute);
    setRoute(nextRoute);
  };

  const navigateTo = (page: BasePage) => {
    updateRoute(getEmptyRoute(page));
  };

  const handleShutdown = async () => {
    setShutdownPending(true);

    try {
      await requestDesktopShutdown();
    } finally {
      setShutdownPending(false);
    }
  };

  const openFinding = (
    finding: ScoredFinding,
    origin: FindingRouteOrigin | null = { mode: "global" }
  ) => {
    updateRoute({
      ...getEmptyRoute("findings"),
      findingId: finding.id,
      findingOrigin: origin,
    });
  };

  const viewState = getRouteViewState(route);
  const pageMeta = getPageMeta(route, viewState);
  const findingBackLabel =
    route.findingOrigin?.mode === "asset" ? "Back to Asset Findings" : "Back to Findings";
  const handleFindingBack = () => {
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
  };
  const findingBreadcrumbs =
    route.findingOrigin?.mode === "asset"
      ? [
          { label: "Business Units", onClick: () => navigateTo("business-services") },
          {
            label:
              route.findingOrigin.businessUnitLabel ??
              formatSlugLabel(route.findingOrigin.businessUnitSlug ?? null, "Business Unit"),
            onClick: () =>
              updateRoute({
                ...getEmptyRoute("business-services"),
                businessUnitSlug: route.findingOrigin?.businessUnitSlug ?? null,
              }),
          },
          {
            label:
              route.findingOrigin.businessServiceLabel ??
              formatSlugLabel(
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
                  label:
                    route.findingOrigin.applicationLabel ??
                    formatSlugLabel(route.findingOrigin.applicationSlug, "Application"),
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
            label: route.findingOrigin.assetLabel ?? route.findingOrigin.assetId ?? "Asset",
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
  const handleBusinessServiceBack = () => {
    updateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
    });
  };
  const handleApplicationBack = () => {
    updateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: null,
    });
  };
  const handleAssetBack = () => {
    updateRoute({
      ...getEmptyRoute("business-services"),
      businessUnitSlug: route.businessUnitSlug,
      businessServiceSlug: route.businessServiceSlug,
      applicationSlug: route.applicationSlug,
      assetId: null,
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-100 text-slate-900">
      <Header
        page={page}
        onNavigate={navigateTo}
        onShutdown={handleShutdown}
        shutdownPending={shutdownPending}
      />
      <div className="flex min-h-0 flex-1">
        <AppSidebar page={page} onNavigate={navigateTo} />

        <div className="min-w-0 flex-1 overflow-auto bg-white">
          <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-4 md:px-6">
            <PageIntro
              title={pageMeta[page].title}
              description={pageMeta[page].description}
              actions={
                viewState.inFindingDetail ? (
                  <Button variant="outline" size="sm" onClick={handleFindingBack}>
                    <ArrowLeft className="h-4 w-4" />
                    {findingBackLabel}
                  </Button>
                ) : viewState.inAssetFindings ? (
                  <Button variant="outline" size="sm" onClick={handleAssetBack}>
                    <ArrowLeft className="h-4 w-4" />
                    {route.applicationSlug ? "Back to Application" : "Back to Business Service"}
                  </Button>
                ) : viewState.inApplicationDetail ? (
                  <Button variant="outline" size="sm" onClick={handleApplicationBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Business Service
                  </Button>
                ) : viewState.inBusinessServiceDetail ? (
                  <Button variant="outline" size="sm" onClick={handleBusinessServiceBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Business Unit
                  </Button>
                ) : viewState.inBusinessUnitDetail ? (
                  <Button variant="outline" size="sm" onClick={() => navigateTo("business-services")}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Company
                  </Button>
                ) : null
              }
            />

            {page === "findings" ? (
              <FindingsRoutePage
                route={route}
                refreshToken={refreshToken}
                findingBreadcrumbs={findingBreadcrumbs}
                findingBackLabel={findingBackLabel}
                onFindingBack={handleFindingBack}
                onDataChanged={() => setRefreshToken((prev) => prev + 1)}
                onNavigate={navigateTo}
                onOpenFinding={openFinding}
              />
            ) : page === "business-services" ? (
              <TopologyRoutePage
                route={route}
                refreshToken={refreshToken}
                viewState={viewState}
                onNavigateOverview={() => navigateTo("business-services")}
                onUpdateRoute={updateRoute}
                onOpenFinding={openFinding}
              />
            ) : page === "integrations" ? (
              <IntegrationsPage refreshToken={refreshToken} />
            ) : (
              <SecurityScorePage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import { BriefcaseBusiness, ListFilter, PlugZap } from "lucide-react";
import type { ScoredFinding } from "./api";
import { Header } from "./components/layout/Header";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { RiskTable } from "./components/dashboard/RiskTable";
import { RiskWeightsEditor } from "./components/dashboard/RiskWeightsEditor";
import { FindingDetailPage } from "./components/dashboard/FindingDetailPage";
import { IntegrationsPage } from "./components/integrations/IntegrationsPage";
import { BusinessServiceDetailPage } from "./components/business-services/BusinessServiceDetailPage";
import { BusinessServicesOverview } from "./components/business-services/BusinessServicesOverview";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import {
  getCompanyBusinessUnitBySlug,
  type CompanyBusinessUnitRecord,
} from "./mocks/businessServices";

type BasePage = "findings" | "integrations" | "business-services";
type AppRoute = {
  page: BasePage;
  findingId: number | null;
  companySlug: string | null;
};

function parsePathRoute(pathname: string): AppRoute | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { page: "business-services", findingId: null, companySlug: null };
  }

  if (parts[0] === "business-services") {
    return {
      page: "business-services",
      findingId: null,
      companySlug: parts[1] ?? null,
    };
  }

  return null;
}

function parseHashRoute(): AppRoute {
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash) {
    return parsePathRoute(window.location.pathname) ?? {
      page: "business-services",
      findingId: null,
      companySlug: null,
    };
  }
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "findings") {
    const id = Number(parts[1]);
    return {
      page: "findings",
      findingId: Number.isInteger(id) && id > 0 ? id : null,
      companySlug: null,
    };
  }
  if (parts[0] === "integrations") {
    return { page: "integrations", findingId: null, companySlug: null };
  }
  if (parts[0] === "business-services") {
    return {
      page: "business-services",
      findingId: null,
      companySlug: parts[1] ?? null,
    };
  }
  return { page: "findings", findingId: null, companySlug: null };
}

function writeHashRoute(route: AppRoute) {
  const useHttpPathRouting =
    window.location.protocol.startsWith("http") && route.page === "business-services";
  const nextUrl = (() => {
    if (useHttpPathRouting) {
      return route.companySlug
        ? `/business-services/${route.companySlug}`
        : "/business-services";
    }

    if (route.page === "findings" && route.findingId) {
      return `/#/findings/${route.findingId}`;
    }
    if (route.page === "findings") {
      return "/#/findings";
    }
    if (route.page === "integrations") {
      return "/#/integrations";
    }
    if (route.page === "business-services" && route.companySlug) {
      return `/#/business-services/${route.companySlug}`;
    }
    return "/#/business-services";
  })();

  const currentUrl = `${window.location.pathname}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    if (window.location.protocol.startsWith("http")) {
      window.history.pushState(route, "", nextUrl);
    } else {
      const hashIndex = nextUrl.indexOf("#");
      window.location.hash = hashIndex >= 0 ? nextUrl.slice(hashIndex) : "";
    }
  }
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!window.location.hash) {
      writeHashRoute({ page: "business-services", findingId: null, companySlug: null });
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

  const navigateTo = (page: BasePage) => {
    const nextRoute = { page, findingId: null, companySlug: null } as AppRoute;
    writeHashRoute(nextRoute);
    setRoute(nextRoute);
  };

  const openFinding = (finding: ScoredFinding) => {
    const nextRoute = {
      page: "findings",
      findingId: finding.id,
      companySlug: null,
    } as AppRoute;
    writeHashRoute(nextRoute);
    setRoute(nextRoute);
  };

  const openBusinessService = (companyRecord: CompanyBusinessUnitRecord) => {
    const nextRoute = {
      page: "business-services",
      findingId: null,
      companySlug: companyRecord.slug,
    } as AppRoute;
    writeHashRoute(nextRoute);
    setRoute(nextRoute);
  };

  const page = route.page;
  const inFindingDetail = page === "findings" && route.findingId !== null;
  const inBusinessServiceDetail =
    page === "business-services" && route.companySlug !== null;
  const selectedBusinessService = getCompanyBusinessUnitBySlug(route.companySlug);

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
      title: inBusinessServiceDetail
        ? selectedBusinessService?.company ?? "Company Overview"
        : "Company Overview",
      description: inBusinessServiceDetail
        ? "Company and business-unit specific view of the underlying business services."
        : "",
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
                  onBack={() => navigateTo("findings")}
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
              inBusinessServiceDetail ? (
                <BusinessServiceDetailPage
                  service={selectedBusinessService}
                  onBack={() => navigateTo("business-services")}
                />
              ) : (
                <BusinessServicesOverview
                  onOpenCompanyBusinessUnit={openBusinessService}
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

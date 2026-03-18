import { useEffect, useState } from "react";
import { ListFilter, PlugZap } from "lucide-react";
import { ScoredFinding } from "./api";
import { Header } from "./components/layout/Header";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { RiskTable } from "./components/dashboard/RiskTable";
import { RiskWeightsEditor } from "./components/dashboard/RiskWeightsEditor";
import { FindingDetailPage } from "./components/dashboard/FindingDetailPage";
import { IntegrationsPage } from "./components/integrations/IntegrationsPage";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";

type BasePage = "findings" | "integrations";
type AppRoute = { page: BasePage; findingId: number | null };

function parseHashRoute(): AppRoute {
  const hash = (window.location.hash || "#/findings").replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "findings") {
    const id = Number(parts[1]);
    return {
      page: "findings",
      findingId: Number.isInteger(id) && id > 0 ? id : null,
    };
  }
  if (parts[0] === "integrations") {
    return { page: "integrations", findingId: null };
  }
  return { page: "findings", findingId: null };
}

function writeHashRoute(route: AppRoute) {
  const nextHash =
    route.page === "findings" && route.findingId
      ? `#/findings/${route.findingId}`
      : route.page === "findings"
        ? "#/findings"
        : route.page === "integrations"
          ? "#/integrations"
          : "#/findings";

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!window.location.hash) {
      writeHashRoute({ page: "findings", findingId: null });
    }
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleDataChanged = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const navigateTo = (page: BasePage) => {
    writeHashRoute({ page, findingId: null });
  };

  const openFinding = (finding: ScoredFinding) => {
    writeHashRoute({ page: "findings", findingId: finding.id });
  };

  const page = route.page;
  const inFindingDetail = page === "findings" && route.findingId !== null;

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
  } as const;

  const navItems: Array<{
    id: "findings" | "integrations";
    label: string;
    icon: typeof ListFilter;
  }> = [
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
              <p className="mt-1 text-sm text-slate-500">{pageMeta[page].description}</p>
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

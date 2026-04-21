import { useState } from "react";
import "./App.css";
import Header from "./components/Header";
import CompaniesView    from "./views/CompaniesView";
import CompanyView      from "./views/CompanyView";
import ServiceView      from "./views/ServiceView";
import ApplicationView  from "./views/ApplicationView";
import AssetView        from "./views/AssetView";

const initialNav = { view: "companies", company: null, service: null, app: null, asset: null };

const VIEW_LABELS = {
  companies:   { sub: "All Organizations" },
  company:     { sub: "Company Overview" },
  service:     { sub: "Business Service" },
  application: { sub: "Application" },
  asset:       { sub: "Asset" },
};

function getScreenLabel(nav) {
  const meta = VIEW_LABELS[nav.view] || {};
  let title = "Organizations";
  if (nav.view === "company"     && nav.company)  title = nav.company.name;
  if (nav.view === "service"     && nav.service)  title = nav.service.name;
  if (nav.view === "application" && nav.app)      title = nav.app.name;
  if (nav.view === "asset"       && nav.asset)    title = nav.asset.hostname;
  return { title, sub: meta.sub };
}

export default function App() {
  const [history, setHistory]           = useState([initialNav]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const nav = history[historyIndex];

  function navigate(target) {
    const newNav = { ...initialNav, ...target };
    // Drop any "forward" entries when branching to a new path
    const newHistory = [...history.slice(0, historyIndex + 1), newNav];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function goBack() {
    if (historyIndex > 0) setHistoryIndex(i => i - 1);
  }

  function goForward() {
    if (historyIndex < history.length - 1) setHistoryIndex(i => i + 1);
  }

  const { title, sub } = getScreenLabel(nav);
  const canGoBack    = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="app-shell">
      <Header
        title={title}
        sub={sub}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={goBack}
        onForward={goForward}
      />
      <main className="app-main">
        {nav.view === "companies" && (
          <CompaniesView
            onSelect={(company) => navigate({ view: "company", company })}
          />
        )}
        {nav.view === "company" && (
          <CompanyView
            company={nav.company}
            onSelectService={(service) => navigate({ view: "service", company: nav.company, service })}
            onNavigate={navigate}
          />
        )}
        {nav.view === "service" && (
          <ServiceView
            service={nav.service}
            company={nav.company}
            onSelectApp={(app) => navigate({ view: "application", company: nav.company, service: nav.service, app })}
            onNavigate={navigate}
          />
        )}
        {nav.view === "application" && (
          <ApplicationView
            app={nav.app}
            service={nav.service}
            company={nav.company}
            onSelectAsset={(asset) => navigate({ view: "asset", company: nav.company, service: nav.service, app: nav.app, asset })}
            onNavigate={navigate}
          />
        )}
        {nav.view === "asset" && (
          <AssetView
            asset={nav.asset}
            app={nav.app}
            service={nav.service}
            company={nav.company}
            onNavigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

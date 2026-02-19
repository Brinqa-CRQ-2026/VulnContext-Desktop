import { useState } from "react";
import { Header } from "./components/layout/Header";
import { SummaryCards } from "./components/dashboard/SummaryCards";
import { RiskTable } from "./components/dashboard/RiskTable";
import { RiskWeightsEditor } from "./components/dashboard/RiskWeightsEditor";
import { IntegrationsPage } from "./components/integrations/IntegrationsPage";
import { useScoresData } from "./hooks/useScoresData";

function App() {
  const [page, setPage] = useState<"dashboard" | "integrations">("dashboard");
  const [refreshToken, setRefreshToken] = useState(0);
  const { summary, loading } = useScoresData(refreshToken);

  const handleDataChanged = () => {
    setRefreshToken((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100">
      <Header page={page} onNavigate={setPage} />

      {page === "dashboard" ? (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
          <SummaryCards summary={summary} loading={loading} />
          <RiskWeightsEditor
            refreshToken={refreshToken}
            onWeightsUpdated={handleDataChanged}
          />
          <RiskTable
            refreshToken={refreshToken}
            onOpenIntegrations={() => setPage("integrations")}
          />
        </main>
      ) : (
        <IntegrationsPage
          refreshToken={refreshToken}
          onDataChanged={handleDataChanged}
        />
      )}
    </div>
  );
}

export default App;

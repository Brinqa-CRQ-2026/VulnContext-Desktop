import { Header } from "./components/layout/Header";
import { SummaryCards } from "./components/dashboard/SummaryCards";
import { RiskOverTimeChart } from "./components/dashboard/RiskOverTimeChart";
import { AssetBubbleChart } from "./components/dashboard/AssetBubbleChart";
import { VulnerabilityAgeChart } from "./components/dashboard/VulnerabilityAgeChart";
import { RemediationHistogram } from "./components/dashboard/RemediationHistogram";
import { CriticalFindingsWidget } from "./components/dashboard/CriticalFindingsWidget";
import { useScoresData } from "./hooks/useScoresData";

function App() {
  const { summary, loading } = useScoresData();

  return (
    <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
        <SummaryCards summary={summary} loading={loading} />
        
        <CriticalFindingsWidget />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <RiskOverTimeChart />
          <VulnerabilityAgeChart />
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <RemediationHistogram />
          <AssetBubbleChart />
        </div>
      </main>
    </div>
  );
}

export default App;
import { Header } from "./components/layout/Header";
import { SummaryCards } from "./components/dashboard/SummaryCards";
import { RiskOverTimeChart } from "./components/dashboard/RiskOverTimeChart";
import { useScoresData } from "./hooks/useScoresData";

function App() {
  const { summary, loading } = useScoresData();

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <SummaryCards summary={summary} loading={loading} />
        <RiskOverTimeChart />
      </main>
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";

import {
  ScoresSummary,
  SourceSummary,
  getScoresSummary,
  getSourcesSummary,
} from "../../api";
import { RiskBandDistributionChart } from "./RiskBandDistributionChart";
import { SummaryCards } from "./SummaryCards";

interface DashboardOverviewProps {
  refreshToken: number;
}

export function DashboardOverview({ refreshToken }: DashboardOverviewProps) {
  const [summary, setSummary] = useState<ScoresSummary | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, sourceData] = await Promise.all([
          getScoresSummary(),
          getSourcesSummary(),
        ]);
        if (!isActive) return;
        setSummary(summaryData);
        setSources(sourceData);
      } catch (err) {
        console.error(err);
        if (!isActive) return;
        setError("Failed to load dashboard metrics.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  return (
    <section className="space-y-4">
      <SummaryCards summary={summary} sources={sources} loading={loading} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-slate-50">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Findings Overview
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Start with concentration at the top of the risk stack.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use this snapshot to see how much of the backlog is sitting in Critical,
              High, or KEV-driven work before drilling into individual findings and
              source-specific queues below.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Critical</div>
                <div className="mt-2 text-2xl font-semibold">
                  {(summary?.risk_bands.Critical ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">High</div>
                <div className="mt-2 text-2xl font-semibold">
                  {(summary?.risk_bands.High ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Sources</div>
                <div className="mt-2 text-2xl font-semibold">
                  {sources.length.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </div>
        <RiskBandDistributionChart summary={summary} loading={loading} />
      </div>
    </section>
  );
}

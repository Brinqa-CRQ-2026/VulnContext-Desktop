import { useMemo } from "react";

import { useSourcesSummary } from "../../hooks/sources/useSourcesSummary";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface IntegrationsPageProps {
  refreshToken: number;
}

export function IntegrationsPage({ refreshToken }: IntegrationsPageProps) {
  const { sources, loading, error } = useSourcesSummary(refreshToken);

  const sortedSources = useMemo(() => {
    return [...sources].sort(
      (a, b) => b.total_findings - a.total_findings || a.source.localeCompare(b.source)
    );
  }, [sources]);

  return (
    <section className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Source Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            This view reflects the read-only source summary currently exposed by the backend.
            Source imports, renames, and deletes are not part of the active runtime.
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading && <p className="text-sm text-slate-500">Loading sources…</p>}

      {!loading && sortedSources.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">No source summaries are available yet.</p>
          </CardContent>
        </Card>
      )}

      {!loading && sortedSources.length > 0 && (
        <div className="grid gap-4">
          {sortedSources.map((source) => (
            <Card key={source.source}>
              <CardHeader>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm font-semibold">{source.source}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {source.total_findings.toLocaleString()} findings
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Total Findings
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">
                      {source.total_findings.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Risk Breakdown
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-600">Critical</span>
                        <span>{source.risk_bands.Critical.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-orange-500">High</span>
                        <span>{source.risk_bands.High.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-500">Medium</span>
                        <span>{source.risk_bands.Medium.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-600">Low</span>
                        <span>{source.risk_bands.Low.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

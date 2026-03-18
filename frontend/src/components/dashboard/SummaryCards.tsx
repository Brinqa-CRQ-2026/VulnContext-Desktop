import React from "react";

import { ScoresSummary, SourceSummary } from "../../api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface SummaryCardsProps {
  summary: ScoresSummary | null;
  sources: SourceSummary[];
  loading: boolean;
}

function formatPercent(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function SummaryCards({ summary, sources, loading }: SummaryCardsProps) {
  const totalFindings =
    summary?.total_findings !== undefined ? summary.total_findings : null;
  const bands = summary?.risk_bands;
  const kevFindings = summary?.kevFindingsTotal ?? 0;
  const sourceCount = sources.length;
  const topSource = [...sources].sort((a, b) => b.total_findings - a.total_findings)[0] ?? null;
  const criticalHighCount = (bands?.Critical ?? 0) + (bands?.High ?? 0);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            TOTAL FINDINGS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {loading && !summary && "…"}
            {!loading &&
              totalFindings !== null &&
              totalFindings.toLocaleString()}
            {!loading && totalFindings === null && "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Current findings loaded into the local dataset.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            KEV FINDINGS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {loading && !summary && "…"}
            {!loading && totalFindings !== null && kevFindings.toLocaleString()}
            {!loading && totalFindings === null && "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {totalFindings !== null
              ? `${formatPercent(kevFindings, totalFindings)} of all findings are marked KEV.`
              : "Known exploited vulnerabilities in the current dataset."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            SOURCES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {loading && sources.length === 0 ? "…" : sourceCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {topSource
              ? `${topSource.source} is the largest source with ${topSource.total_findings.toLocaleString()} findings.`
              : "Distinct imported sources currently represented."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            CRITICAL + HIGH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {loading && !summary && "…"}
            {!loading && totalFindings !== null && criticalHighCount.toLocaleString()}
            {!loading && totalFindings === null && "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {bands && totalFindings !== null
              ? `${formatPercent(criticalHighCount, totalFindings)} of findings are currently in the top two risk bands.`
              : "Current high-priority share of the dataset."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

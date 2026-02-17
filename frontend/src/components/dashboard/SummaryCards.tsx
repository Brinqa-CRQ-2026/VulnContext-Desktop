// src/components/dashboard/SummaryCards.tsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../ui/card";
import { ScoresSummary } from "../../api";
import { RiskDistributionChart } from "./RiskDistributionChart";

interface SummaryCardsProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const totalFindings =
    summary?.total_findings !== undefined ? summary.total_findings : null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* TOTAL FINDINGS */}
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
            Count across all scanned assets.
          </p>
        </CardContent>
      </Card>

      {/* RISK FACTORS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            RISK FACTORS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400">
            Placeholder for EPSS ≥95, KEV, etc.
          </p>
        </CardContent>
      </Card>

      {/* SOURCES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            SOURCES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400">
            Placeholder for scanner/source mix.
          </p>
        </CardContent>
      </Card>

      {/* RISK DISTRIBUTION PIE CHART */}
      <RiskDistributionChart summary={summary} loading={loading} />
    </div>
  );
}
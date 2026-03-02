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
import { AttackVectorChart } from "./AttackVectorChart";

interface SummaryCardsProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const totalFindings =
    summary?.total_findings !== undefined ? summary.total_findings : null;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* TOTAL FINDINGS */}
      <Card className="shadow-md border-slate-200/60 md:col-span-1">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-slate-900">
            {loading && !summary && "…"}
            {!loading &&
              totalFindings !== null &&
              totalFindings.toLocaleString()}
            {!loading && totalFindings === null && "—"}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Across all scanned assets
          </p>
        </CardContent>
      </Card>

      {/* ATTACK VECTOR DISTRIBUTION */}
      <div className="md:col-span-2">
        <AttackVectorChart />
      </div>

      {/* RISK DISTRIBUTION PIE CHART */}
      <div className="md:col-span-2">
        <RiskDistributionChart summary={summary} loading={loading} />
      </div>
    </div>
  );
}
// src/components/dashboard/SummaryCards.tsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../ui/card";
import { ScoresSummary } from "../../api";

interface SummaryCardsProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const totalFindings =
    summary?.total_findings !== undefined ? summary.total_findings : null;
  const bands = summary?.risk_bands;

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

      {/* RISK FACTORS – still placeholder for now */}
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

      {/* SOURCES – still placeholder */}
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

      {/* RISK DISTRIBUTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            RISK DISTRIBUTION
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !bands && (
            <p className="text-xs text-slate-400">Loading distribution…</p>
          )}
          {!loading && bands && (
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-600">Critical</span>
                <span>{bands.Critical.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-orange-500">High</span>
                <span>{bands.High.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-500">Medium</span>
                <span>{bands.Medium.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-600">Low</span>
                <span>{bands.Low.toLocaleString()}</span>
              </div>
            </div>
          )}
          {!loading && !bands && (
            <p className="text-xs text-slate-400">No data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
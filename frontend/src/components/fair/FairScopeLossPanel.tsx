import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { FairLossPredictionResponse } from "../../types";
import {
  readControlContext,
  toNestedControlContext,
} from "../../lib/securityScore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FairScopeLossPanelProps {
  title: string;
  description: string;
  onPredict: (payload: {
    control_context: ReturnType<typeof toNestedControlContext>;
    primary_loss_mean: number;
    secondary_loss_mean: number;
    iterations: number;
  }) => Promise<FairLossPredictionResponse>;
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value?: number | null, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function FairScopeLossPanel({
  title,
  description,
  onPredict,
}: FairScopeLossPanelProps) {
  const [primaryMean, setPrimaryMean] = useState(100000);
  const [secondaryMean, setSecondaryMean] = useState(40000);
  const [prediction, setPrediction] = useState<FairLossPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await onPredict({
          control_context: toNestedControlContext(readControlContext()),
          primary_loss_mean: primaryMean,
          secondary_loss_mean: secondaryMean,
          iterations: 10000,
        });
        if (active) {
          setPrediction(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to generate FAIR loss.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [onPredict, primaryMean, secondaryMean]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            aria-label="Explain FAIR loss exposure"
            title="Explain FAIR loss exposure"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FairScopeInfoPopup open={infoOpen} onClose={() => setInfoOpen(false)} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            ) : loading && !prediction ? (
              <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">
                Generating FAIR loss exposure...
              </div>
            ) : prediction ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryTile label="Threat events / year" value={formatNumber(prediction.tef_mean)} />
                <SummaryTile label="Loss events / year" value={formatNumber(prediction.lef_mean)} />
                <SummaryTile label="Vulnerability" value={formatPercent(prediction.vulnerability)} />
                <SummaryTile label="Security Score" value={`${Math.round(prediction.control_score * 100)}%`} />
                <SummaryTile label="Expected annual loss" value={formatCurrency(prediction.loss_mean)} />
                <SummaryTile label="P90 annual loss" value={formatCurrency(prediction.loss_p90)} />
                <SummaryTile label="P95 annual loss" value={formatCurrency(prediction.loss_p95)} />
                <SummaryTile label="Worst modeled year" value={formatCurrency(prediction.worst_loss)} />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-base font-semibold text-slate-900">Loss assumptions</div>
            <div className="mt-4 grid gap-5">
              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Primary mean
                  <span className="text-slate-900">{formatCurrency(primaryMean)}</span>
                </span>
                <input
                  className="h-2 cursor-pointer accent-slate-950"
                  type="range"
                  min="0"
                  max="2000000"
                  step="10000"
                  value={primaryMean}
                  onChange={(event) => setPrimaryMean(Number(event.target.value))}
                />
              </label>
              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Secondary mean
                  <span className="text-slate-900">{formatCurrency(secondaryMean)}</span>
                </span>
                <input
                  className="h-2 cursor-pointer accent-slate-950"
                  type="range"
                  min="0"
                  max="2000000"
                  step="10000"
                  value={secondaryMean}
                  onChange={(event) => setSecondaryMean(Number(event.target.value))}
                />
              </label>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Primary loss covers direct response and recovery costs. Secondary loss covers
              downstream business impact such as revenue loss, churn, or regulatory exposure.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FairScopeInfoPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const sections = [
    {
      title: "Scope",
      body: "This view estimates annualized FAIR loss exposure for the business service, not for one isolated vulnerability.",
    },
    {
      title: "Finding drivers",
      body: "The highest-risk findings under the business service are used as likelihood drivers. Scope TEF starts from the strongest finding signal and adds a diversity bonus for distinct assets instead of summing every finding.",
    },
    {
      title: "Security Score",
      body: "The saved Security Score reduces modeled vulnerability by representing current security maturity.",
    },
    {
      title: "Loss assumptions",
      body: "Primary mean covers direct response and recovery costs. Secondary mean covers downstream impact such as revenue loss, churn, reputation, or regulatory exposure.",
    },
    {
      title: "Outputs",
      body: "Expected loss, P90, P95, and worst modeled year are annualized financial loss estimates. LEF is the modeled loss event frequency per year.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">FAIR scope guide</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Business service FAIR treats applications, assets, and findings as likelihood
              drivers while the service carries the business loss exposure.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close FAIR guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {section.title}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

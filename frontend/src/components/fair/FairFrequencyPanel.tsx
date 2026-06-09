import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { FairLossPredictionResponse } from "../../types";
import {
  readControlContext,
  toNestedControlContext,
} from "../../lib/securityScore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FairFrequencyPanelProps {
  title: string;
  description: string;
  scopeLabel: "finding" | "asset" | "application";
  onPredict: (payload: {
    control_context: ReturnType<typeof toNestedControlContext>;
    primary_loss_mean: number;
    secondary_loss_mean: number;
    iterations: number;
  }) => Promise<FairLossPredictionResponse>;
}

function formatNumber(value?: number | null, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatPercent(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function FairFrequencyPanel({
  title,
  description,
  scopeLabel,
  onPredict,
}: FairFrequencyPanelProps) {
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
          primary_loss_mean: 0,
          secondary_loss_mean: 0,
          iterations: 10000,
        });
        if (active) {
          setPrediction(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to generate FAIR frequency.");
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
  }, [onPredict]);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            aria-label="Explain FAIR frequency indicators"
            title="Explain FAIR frequency indicators"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <FairFrequencyInfoPopup
          open={infoOpen}
          scopeLabel={scopeLabel}
          onClose={() => setInfoOpen(false)}
        />
        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : loading && !prediction ? (
          <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50/60 text-sm text-slate-500">
            Generating FAIR frequency indicators...
          </div>
        ) : prediction ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FrequencyTile
              label="Threat event frequency"
              value={formatNumber(prediction.tef_mean)}
              hint="Modeled threat events per year"
            />
            <FrequencyTile
              label="Loss event frequency"
              value={formatNumber(prediction.lef_mean)}
              hint="Modeled loss events per year"
            />
            <FrequencyTile
              label="Vulnerability"
              value={formatPercent(prediction.vulnerability, 2)}
              hint="Chance a threat event becomes successful"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FrequencyTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </div>
  );
}

function FairFrequencyInfoPopup({
  open,
  scopeLabel,
  onClose,
}: {
  open: boolean;
  scopeLabel: "finding" | "asset" | "application";
  onClose: () => void;
}) {
  if (!open) return null;

  const scopeText =
    scopeLabel === "finding"
      ? "This finding view shows likelihood indicators only. It does not assign dollar loss to the finding."
      : scopeLabel === "asset"
        ? "This asset view aggregates likelihood indicators across the asset's highest-risk findings. It does not ask for asset-level dollar loss."
        : "This application view aggregates likelihood indicators across the application's assets and findings. It does not ask for application-level dollar loss.";
  const sections = [
    {
      title: "TEF",
      body: "Threat Event Frequency estimates how often threat events are expected to occur in this scope. For assets and rollups, it uses the strongest finding signal plus a diversity bonus instead of summing every finding.",
    },
    {
      title: "LEF",
      body: "Loss Event Frequency estimates how often threat events become actual loss events after vulnerability and controls are considered.",
    },
    {
      title: "Security Score",
      body: "The saved Security Score reduces modeled vulnerability by representing current security maturity.",
    },
    {
      title: "Why no dollars?",
      body: "Monetary loss is modeled at the business service layer, where business impact assumptions like downtime, revenue loss, churn, and regulatory exposure are easier to define consistently.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <div className="text-base font-semibold text-slate-900">FAIR frequency guide</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {scopeText} Findings, assets, and applications explain likelihood. Business services
              carry the financial loss model.
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

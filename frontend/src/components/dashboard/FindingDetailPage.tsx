import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FairLossPredictionResponse, FindingRouteOrigin, ScoredFinding } from "../../types";
import { predictFindingFairLoss } from "../../api/findings";
import type { BreadcrumbEntry } from "../business-services/TopologyChrome";
import { useFindingDetails } from "../../hooks/findings/useFindingDetails";
import {
  readControlContext,
  toNestedControlContext,
} from "../../lib/controlQuestionnaire";
import { EntityHero } from "../business-services/shared/EntityHero";
import { MetricCard, MetricGrid } from "../business-services/shared/MetricCard";
import { StatusBadge } from "../business-services/shared/TopologyBadges";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  FindingAffectedContextSection,
  FindingOverviewSection,
  FindingRemediationSection,
  FindingSupportingDetailsSection,
  formatAge,
  formatNumber,
  isPopulated,
  joinText,
} from "./FindingDetailSections";

interface FindingDetailPageProps {
  findingId: string;
  refreshToken: number;
  origin?: FindingRouteOrigin | null;
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  onDataChanged?: () => void;
}

function formatStatus(finding: ScoredFinding) {
  return [finding.status, finding.lifecycle_status].filter(Boolean).join(" / ") || null;
}

function getFindingTitle(finding: ScoredFinding) {
  const raw = (finding.display_name || "").trim();
  const cve = (finding.cve_id || "").trim().toUpperCase();

  if (!raw) {
    return cve || "Finding";
  }
  if (!cve) {
    return raw;
  }

  const suffixPattern = new RegExp(`:\\s*${cve}$`, "i");
  const exactPattern = new RegExp(`^${cve}$`, "i");

  if (suffixPattern.test(raw)) {
    const stripped = raw.replace(suffixPattern, "").trim();
    if (stripped) return stripped;
  }
  if (exactPattern.test(raw)) {
    return cve;
  }

  return raw;
}

function getAssetLabel(finding: ScoredFinding, origin?: FindingRouteOrigin | null) {
  if (origin?.assetLabel) return origin.assetLabel;
  if (isPopulated(finding.target_names)) return finding.target_names;
  return "-";
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function LoadingState({
  breadcrumbs,
  backLabel,
  onBack,
}: {
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <EntityHero
      breadcrumbs={breadcrumbs}
      label="Finding"
      title="Loading finding"
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}

function ErrorState({
  breadcrumbs,
  backLabel,
  onBack,
  message,
}: {
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  message: string;
}) {
  return (
    <EntityHero
      breadcrumbs={breadcrumbs}
      label="Finding"
      title="Finding not available"
      metadata={<span className="text-rose-600">{message}</span>}
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}

function HeroTags({ finding }: { finding: ScoredFinding }) {
  const displayedStatus = formatStatus(finding);
  const tags: ReactNode[] = [
    <StatusBadge key="source" tone="neutral">
      Source: {finding.source || "Unknown source"}
    </StatusBadge>,
    <StatusBadge key="risk" tone={finding.risk_band || "neutral"}>
      {finding.risk_band || "Unrated"} / {formatNumber(finding.risk_score)}
    </StatusBadge>,
  ];

  if (finding.cve_id) {
    tags.push(
      <StatusBadge key="cve" tone="neutral">
        CVE: {finding.cve_id}
      </StatusBadge>
    );
  }
  if (displayedStatus) {
    tags.push(
      <StatusBadge key="status" tone="neutral">
        Status: {displayedStatus}
      </StatusBadge>
    );
  }
  if (finding.isKev) {
    tags.push(
      <StatusBadge key="kev" tone="warn">
        KEV
      </StatusBadge>
    );
  }

  return <div className="flex flex-wrap items-center justify-end gap-2">{tags}</div>;
}

function LossPredictionPanel({ finding }: { finding: ScoredFinding }) {
  const [primaryMean, setPrimaryMean] = useState(50000);
  const [secondaryMean, setSecondaryMean] = useState(15000);
  const [prediction, setPrediction] = useState<FairLossPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const chartData = useMemo(
    () =>
      prediction?.histogram.map((point) => ({
        loss: point.loss,
        probability: point.probability,
      })) ?? [],
    [prediction]
  );

  useEffect(() => {
    if (!generated) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await predictFindingFairLoss(finding.id, {
          control_context: toNestedControlContext(readControlContext()),
          primary_loss_mean: primaryMean,
          secondary_loss_mean: secondaryMean,
          iterations: 10000,
        });
        if (!controller.signal.aborted) {
          setPrediction(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to generate prediction.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [finding.id, generated, primaryMean, secondaryMean]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">FAIR Predicted Loss</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-h-[320px] rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            {!generated ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <div className="text-sm font-semibold text-slate-900">
                  Generate predicted annualized loss
                </div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Uses this finding, asset context, the saved security questionnaire,
                  and the backend FAIR frequency, magnitude, and risk engines.
                </p>
                <Button className="mt-4" onClick={() => setGenerated(true)}>
                  Generate Predicted Loss
                </Button>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : loading && !prediction ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
                Generating prediction...
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="loss"
                      minTickGap={24}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis
                      width={42}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${(Number(value) * 100).toFixed(1)}%`,
                        "Probability",
                      ]}
                      labelFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <Area
                      type="monotone"
                      dataKey="probability"
                      stroke="#0f172a"
                      fill="#0f172a"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Magnitude assumptions</div>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2">
                  <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Primary mean
                    <span className="text-slate-900">{formatCurrency(primaryMean)}</span>
                  </span>
                  <input
                    className="h-2 cursor-pointer accent-slate-950"
                    type="range"
                    min="0"
                    max="1000000"
                    step="5000"
                    value={primaryMean}
                    onChange={(event) => setPrimaryMean(Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Secondary mean
                    <span className="text-slate-900">{formatCurrency(secondaryMean)}</span>
                  </span>
                  <input
                    className="h-2 cursor-pointer accent-slate-950"
                    type="range"
                    min="0"
                    max="1000000"
                    step="5000"
                    value={secondaryMean}
                    onChange={(event) => setSecondaryMean(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>

            {prediction ? (
              <MetricGrid className="grid-cols-1">
                <MetricCard
                  label="P50 / median"
                  value={formatCurrency(prediction.loss_p50)}
                  hint={`Mean ${formatCurrency(prediction.loss_mean)}`}
                />
                <MetricCard
                  label="P90"
                  value={formatCurrency(prediction.loss_p90)}
                  hint={`P95 ${formatCurrency(prediction.loss_p95)}`}
                />
                <MetricCard
                  label="Worst simulated loss"
                  value={formatCurrency(prediction.worst_loss)}
                  hint={`P99 ${formatCurrency(prediction.loss_p99)}`}
                />
                <MetricCard
                  label="Frequency"
                  value={`LEF ${formatNumber(prediction.lef_mean, 3)}`}
                  hint={`TEF ${formatNumber(prediction.tef_mean, 3)} / year`}
                />
                <MetricCard
                  label="Control score"
                  value={`${Math.round(prediction.control_score * 100)}%`}
                  hint={`Vulnerability ${formatNumber(prediction.vulnerability, 4)}`}
                />
              </MetricGrid>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FindingDetailPage({
  findingId,
  refreshToken,
  origin,
  breadcrumbs,
  backLabel,
  onBack,
}: FindingDetailPageProps) {
  const { finding, loading, error } = useFindingDetails(findingId, refreshToken);

  if (loading) {
    return (
      <LoadingState
        breadcrumbs={breadcrumbs}
        backLabel={backLabel}
        onBack={onBack}
      />
    );
  }

  if (error || !finding) {
    return (
      <ErrorState
        breadcrumbs={breadcrumbs}
        backLabel={backLabel}
        onBack={onBack}
        message={error || "Finding not found."}
      />
    );
  }

  const title = getFindingTitle(finding);
  const assetLabel = getAssetLabel(finding, origin);
  const businessContext = [
    origin?.businessUnitLabel,
    origin?.businessServiceLabel,
    origin?.applicationLabel,
  ]
    .filter(Boolean)
    .join(" / ");
  const subtitle = joinText(
    [assetLabel !== "-" ? assetLabel : null, businessContext || null, finding.source || null],
    finding.source || "Finding detail"
  );
  const recommendationText = finding.kevRequiredAction || null;
  const hasDistinctCveDescription =
    isPopulated(finding.cveDescription) &&
    finding.cveDescription?.trim() !== finding.description?.trim();
  const dueDateValue = finding.due_date || finding.kevDueDate;
  const hasRemediationSnapshot = Boolean(
    recommendationText
      || isPopulated(finding.kevRequiredAction)
      || isPopulated(finding.remediation_owner_name)
      || isPopulated(finding.remediation_status)
      || finding.due_date
      || finding.kevDueDate
  );
  const hasAttackContext = Boolean(
    isPopulated(finding.attack_pattern_names)
      || isPopulated(finding.attack_technique_names)
      || isPopulated(finding.attack_tactic_names)
  );

  return (
    <div className="flex flex-col gap-5">
      <EntityHero
        breadcrumbs={breadcrumbs}
        label="Finding"
        title={title}
        metadata={subtitle}
        tags={<HeroTags finding={finding} />}
        backLabel={backLabel}
        onBack={onBack}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Display Risk"
          value={formatNumber(finding.risk_score)}
          hint={finding.risk_band || "Unrated"}
        />
        <MetricCard
          label="Vendor Risk"
          value={formatNumber(finding.source_risk_score)}
          hint={joinText([finding.source_risk_rating, finding.source_risk_band], "Unspecified")}
        />
        <MetricCard
          label="CVSS"
          value={formatNumber(finding.cvss_score)}
          hint={finding.cvss_severity || "Unspecified"}
        />
        <MetricCard
          label="EPSS"
          value={formatNumber(finding.epss_score, 4)}
          hint={`Percentile ${formatNumber(finding.epss_percentile, 4)}`}
        />
        <MetricCard
          label="Age"
          value={formatAge(finding.age_in_days)}
          hint={assetLabel !== "-" ? assetLabel : undefined}
        />
      </MetricGrid>

      <LossPredictionPanel finding={finding} />

      <FindingOverviewSection
        finding={finding}
        recommendationText={recommendationText}
        hasDistinctCveDescription={hasDistinctCveDescription}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <FindingRemediationSection
          finding={finding}
          recommendationText={recommendationText}
          hasRemediationSnapshot={hasRemediationSnapshot}
          dueDateValue={dueDateValue}
        />
        <FindingAffectedContextSection
          finding={finding}
          origin={origin}
          assetLabel={assetLabel}
          businessContext={businessContext}
        />
      </div>

      <FindingSupportingDetailsSection
        finding={finding}
        hasAttackContext={hasAttackContext}
      />
    </div>
  );
}

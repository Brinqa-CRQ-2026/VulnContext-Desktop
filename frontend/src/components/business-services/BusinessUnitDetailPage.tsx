import { ArrowLeft, Layers3 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  BusinessServiceSummary,
  ScoredFinding,
} from "../../api/types";
import { useBusinessUnitDetail } from "../../hooks/topology/useBusinessUnitDetail";
import { useBusinessUnitRiskOverview } from "../../hooks/topology/useBusinessUnitRiskOverview";
import { useBusinessUnitTopFindings } from "../../hooks/topology/useBusinessUnitTopFindings";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { AssetDistributionChartCard } from "./AssetDistributionCharts";
import {
  formatSlugLabel,
  TopologyBreadcrumbs,
  TopologyPageSkeleton,
} from "./TopologyChrome";
import { type BusinessUnitRiskBand, type RiskTrendPoint } from "./businessUnitDetailMockData";

interface BusinessUnitDetailPageProps {
  businessUnitSlug: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessService: (businessService: BusinessServiceSummary) => void;
  onOpenFinding?: (finding: ScoredFinding) => void;
}

const riskChartConfig = {
  score: {
    label: "Risk score",
    color: "hsl(351 89% 61%)",
  },
} satisfies ChartConfig;

export function BusinessUnitDetailPage({
  businessUnitSlug,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessService,
  onOpenFinding,
}: BusinessUnitDetailPageProps) {
  const { businessUnit, loading, error } = useBusinessUnitDetail(
    businessUnitSlug,
    refreshToken
  );
  const {
    riskOverview,
    loading: riskLoading,
    error: riskError,
  } = useBusinessUnitRiskOverview(businessUnitSlug, refreshToken);
  const {
    data: topFindings,
    loading: topFindingsLoading,
    error: topFindingsError,
  } = useBusinessUnitTopFindings(businessUnitSlug, {
    pageSize: 5,
    sortBy: "risk_score",
    sortOrder: "desc",
    refreshToken,
  });
  if (loading) {
    return (
      <TopologyPageSkeleton
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: formatSlugLabel(businessUnitSlug, "Business Unit") },
        ]}
        title="Loading business unit"
        backLabel="Back to Business Units"
        statCount={4}
        tableColumns={3}
      />
    );
  }

  if (error || !businessUnit) {
    return (
      <DetailEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Business unit not found"
        }
        description={
          error ?? "The selected business unit does not exist in the live topology."
        }
        onBack={onBack}
      />
    );
  }

  const riskScore = riskOverview?.risk_score ?? null;
  const riskBand = (riskOverview?.risk_band as BusinessUnitRiskBand | null) ?? null;
  const riskTrend = riskOverview?.risk_trend.map((point) => ({
    month: point.period,
    score: point.score,
  }));
  const severityCounts = riskOverview
    ? {
        critical: riskOverview.severity_counts.Critical,
        high: riskOverview.severity_counts.High,
        medium: riskOverview.severity_counts.Medium,
        low: riskOverview.severity_counts.Low,
      }
    : null;
  const findingRiskDistribution = riskOverview?.finding_risk_distribution ?? null;
  const topFindingsItems = topFindings?.items.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <TopologyBreadcrumbs
          items={[
            { label: "Business Units", onClick: onOpenOverview },
            { label: businessUnit.business_unit },
          ]}
        />
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            <InitialsBadge value={businessUnit.business_unit} />
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
                {businessUnit.company?.name ?? "Unassigned company"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {businessUnit.business_unit}
              </h1>
              {businessUnit.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {businessUnit.description}
                </p>
              ) : (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Live business-unit description is not available yet.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge band={riskBand} />
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Risk score {riskScore}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenOverview}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </section>

      <dl className="grid gap-4 md:grid-cols-4">
        <DetailStat
          label="Business Services"
          value={businessUnit.metrics.total_business_services}
        />
        <DetailStat
          label="Applications"
          value={businessUnit.metrics.total_applications}
        />
        <DetailStat label="Assets" value={businessUnit.metrics.total_assets} />
        <DetailStat label="Findings" value={businessUnit.metrics.total_findings} />
      </dl>

      <RiskOverview
        businessUnitName={businessUnit.business_unit}
        riskBand={riskBand}
        riskScore={riskScore}
        trend={riskTrend}
        loading={riskLoading}
        error={riskError}
        severityCounts={severityCounts}
        findingRiskDistribution={findingRiskDistribution}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Business Services</h2>
            <p className="mt-1 text-sm text-slate-500">
              Click a service to inspect its applications, assets, and scoped findings.
            </p>
          </div>
        </div>

        {businessUnit.business_services.length === 0 ? (
          <Empty className="min-h-[12rem]">
            <EmptyHeader>
              <EmptyTitle>No business services</EmptyTitle>
              <EmptyDescription>
                This business unit currently has no child business services.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {businessUnit.business_services.map((businessService) => (
              <BusinessServiceCard
                key={businessService.slug}
                businessService={businessService}
                onOpen={() => onOpenBusinessService(businessService)}
              />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Top Findings in this Business Unit</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Highest-risk findings scoped to {businessUnit.business_unit}.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/findings?businessUnitId=${encodeURIComponent(businessUnit.uuid ?? businessUnit.uid ?? businessUnit.slug)}`}>
              View all findings
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {topFindingsLoading ? (
            <TableStateMessage message="Loading findings..." />
          ) : topFindingsError ? (
            <TableStateMessage message={topFindingsError} tone="error" />
          ) : topFindingsItems.length === 0 ? (
            <TableStateMessage message="No finding data" />
          ) : (
            <BusinessUnitFindingsTable
              findings={topFindingsItems}
              onOpenFinding={onOpenFinding ?? (() => undefined)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskOverview({
  businessUnitName,
  riskBand,
  riskScore,
  trend,
  loading,
  error,
  severityCounts,
  findingRiskDistribution,
}: {
  businessUnitName: string;
  riskBand: BusinessUnitRiskBand | null;
  riskScore: number | null;
  trend: RiskTrendPoint[] | undefined;
  loading: boolean;
  error: string | null;
  severityCounts: Record<Lowercase<BusinessUnitRiskBand>, number> | null;
  findingRiskDistribution: AssetScoreDistribution | null;
}) {
  const totalSeverity = useMemo(() => {
    if (!severityCounts) {
      return 0;
    }
    return Object.values(severityCounts).reduce((total, count) => total + count, 0);
  }, [severityCounts]);
  const hasRiskData = Boolean(
    trend && trend.length > 0 && (riskScore !== null || totalSeverity > 0)
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_auto] items-start">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Risk over time</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Showing risk trend for {businessUnitName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tracking-tight text-slate-950">
                {riskScore !== null ? riskScore : "No risk score data"}
              </div>
              <div className="text-xs font-medium text-slate-500">
                {riskBand ? `${riskBand} risk` : "No risk band data"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {!hasRiskData ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">
              {loading ? "Loading risk data..." : error ?? "No risk trend data"}
            </div>
          ) : (
            <ChartContainer config={riskChartConfig} className="h-[260px] w-full">
              <AreaChart accessibilityLayer data={trend}>
                <defs>
                  <linearGradient id="businessUnitRiskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="score"
                  type="natural"
                  fill="url(#businessUnitRiskFill)"
                  stroke="var(--color-score)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <AssetDistributionChartCard
        title="Finding risk spread"
        description="Aggregated finding risk distribution for this business unit"
        distribution={findingRiskDistribution}
        totalCount={totalSeverity}
        countUnit="findings"
        loading={loading}
        error={error}
        cardClassName="flex flex-col justify-between overflow-hidden"
        chartContainerClassName="w-full"
        emptyMessage="No finding data"
      />
    </section>
  );
}

function BusinessServiceCard({
  businessService,
  onOpen,
}: {
  businessService: BusinessServiceSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[14rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      aria-label={`Open ${businessService.business_service}`}
    >
      <div className="flex items-start justify-between gap-3">
        <InitialsBadge value={businessService.business_service} compact />
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          No risk data
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Business Service
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
          {businessService.business_service}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
          Service metadata will be populated when the backend returns service descriptions.
        </p>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricLine
            value={businessService.metrics.total_applications}
            label="Applications"
          />
          <MetricLine value={businessService.metrics.total_assets} label="Assets" />
          <MetricLine value={businessService.metrics.total_findings} label="Findings" />
        </div>
      </div>
    </button>
  );
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {value.toLocaleString()}
        </dd>
      </CardContent>
    </Card>
  );
}

function MetricLine({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold text-slate-950 tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="truncate text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function BusinessUnitFindingsTable({
  findings,
  onOpenFinding,
}: {
  findings: ScoredFinding[];
  onOpenFinding: (finding: ScoredFinding) => void;
}) {
  return (
    <Table className="min-w-[1024px] table-fixed">
      <colgroup>
        <col className="w-[104px]" />
        <col className="w-[72px]" />
        <col />
        <col className="w-[150px]" />
        <col className="w-[150px]" />
        <col className="w-[170px]" />
        <col className="w-[200px]" />
        <col className="w-[128px]" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap px-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Status</TableHead>
          <TableHead className="px-4 text-center text-[11px] uppercase tracking-[0.16em] text-slate-500">KEV</TableHead>
          <TableHead className="px-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Finding</TableHead>
          <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">CVSS</TableHead>
          <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">EPSS</TableHead>
          <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">Age</TableHead>
          <TableHead className="whitespace-nowrap border-l border-slate-200 px-4 text-right text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Display risk
          </TableHead>
          <TableHead className="whitespace-nowrap px-4 text-right text-[11px] uppercase tracking-[0.16em] text-slate-500">Risk band</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
              No findings available for this business unit.
            </TableCell>
          </TableRow>
        ) : (
          findings.map((finding) => {
            const normalizedStatus = normalizeFindingStatus(finding);

            return (
              <TableRow
                key={finding.id}
                className="cursor-pointer border-b border-slate-200 hover:bg-slate-50/80"
                onClick={() => onOpenFinding(finding)}
              >
                <TableCell className="px-4 py-4">
                  <Badge tone={statusTone(normalizedStatus)}>{normalizedStatus}</Badge>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  {finding.isKev ? <Badge tone="dark">KEV</Badge> : "—"}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">
                      {getNormalizedFindingTitle(finding)}
                    </div>
                    <div className="text-xs text-slate-500">{finding.cve_id}</div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.cvss_score)}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.epss_score, 4)}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">
                  {finding.age_in_days !== null && finding.age_in_days !== undefined
                    ? `${formatNumber(finding.age_in_days, 0)}d`
                    : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap border-l border-slate-200 px-4 py-4 text-right font-semibold text-slate-900">
                  {formatNumber(finding.risk_score)}
                </TableCell>
                <TableCell className="px-4 py-4 text-right">
                  <div className="flex justify-end">
                    {finding.risk_band ? <Badge tone={finding.risk_band}>{finding.risk_band}</Badge> : "—"}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

function TableStateMessage({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed text-sm",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50/70 text-slate-500"
      )}
    >
      {message}
    </div>
  );
}

function InitialsBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 shadow-sm",
        compact ? "h-10 w-10 text-sm" : "h-12 w-12 text-base"
      )}
    >
      {getInitials(value)}
    </div>
  );
}

function RiskBadge({ band }: { band: BusinessUnitRiskBand | null }) {
  if (!band) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        riskBadgeClass(band)
      )}
    >
      {band} Risk
    </span>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "Critical" | "High" | "Medium" | "Low" | "neutral" | "warn" | "dark" | "low" | string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", badgeClass(tone))}>
      {children}
    </span>
  );
}

function DetailEmptyState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <Empty>
      <EmptyIcon>
        <Layers3 className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={onBack}>
        Back to Business Units
      </Button>
    </Empty>
  );
}

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function riskBadgeClass(band: BusinessUnitRiskBand) {
  switch (band) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "High":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Medium":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function badgeClass(tone: string) {
  if (tone === "Critical") return "bg-rose-100 text-rose-700";
  if (tone === "High") return "bg-orange-100 text-orange-700";
  if (tone === "Medium") return "bg-amber-100 text-amber-700";
  if (tone === "Low" || tone === "low") return "bg-emerald-100 text-emerald-700";
  if (tone === "warn") return "border border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "dark") return "bg-slate-900 text-white";
  return "bg-slate-100 text-slate-700";
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function normalizeFindingStatus(finding: ScoredFinding) {
  const combined = [finding.status, finding.lifecycle_status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/fixed|closed|resolved|remediated/.test(combined)) {
    return "Fixed";
  }
  if (/inactive|unactive|retired/.test(combined)) {
    return "Inactive";
  }
  if (/active|open|new/.test(combined)) {
    return "Active";
  }
  return "Active";
}

function statusTone(status: "Active" | "Inactive" | "Fixed"): "low" | "neutral" | "dark" {
  if (status === "Fixed") return "dark";
  if (status === "Active") return "low";
  return "neutral";
}

function isTopologyUnavailable(message: string | null) {
  return (message ?? "").toLowerCase().includes("normalized topology");
}

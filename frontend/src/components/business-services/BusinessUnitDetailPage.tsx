import { Info, Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  BusinessServiceSummary,
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../types";
import { useBusinessUnitDetail } from "../../hooks/topology/business-units/useBusinessUnitDetail";
import { useBusinessUnitRiskOverview } from "../../hooks/topology/business-units/useBusinessUnitRiskOverview";
import { useBusinessUnitTopFindings } from "../../hooks/topology/business-units/useBusinessUnitTopFindings";
import { getPaginationWindow } from "../../lib/pagination/getPaginationWindow";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { riskBandPillClass } from "../../lib/findings/findingRisk";
import { normalizeFindingStatus } from "../../lib/findings/findingStatus";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { Button } from "../ui/button";
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
import { AssetDistributionChartCard } from "./AssetDistributionCharts";
import {
  formatSlugLabel,
} from "./TopologyChrome";
import {
  type BusinessUnitRiskBand,
  type BusinessUnitRiskTrendChartPoint,
} from "./types";
import { ChartPanel } from "./shared/ChartPanel";
import { BusinessServiceEntityCard } from "./shared/EntityCard";
import { EntityHero } from "./shared/EntityHero";
import { MetricCard, MetricGrid } from "./shared/MetricCard";
import { StatusBadge } from "./shared/TopologyBadges";
import { LoadingSpinnerState } from "../shared/LoadingSpinnerState";
import { FindingsTable, type FindingsTableColumn } from "../findings/FindingsTable";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

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

const FINDINGS_PAGE_SIZE = 20;
const RISK_BAND_OPTIONS: RiskBandFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const SORT_OPTIONS: Array<{ label: string; value: FindingsSortBy }> = [
  { label: "Priority Score", value: "priority_score" },
  { label: "Risk Score", value: "risk_score" },
  { label: "Age", value: "age_in_days" },
];

const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "—");

function deriveRiskBand(score?: number | null) {
  if (score === null || score === undefined) return null;
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

function PriorityScoreLabel() {
  return (
    <span className="inline-flex w-full items-center justify-end gap-1.5">
      Priority Score
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            aria-label="About priority score"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)] whitespace-normal text-left text-sm leading-5"
        >
          <div className="font-semibold text-slate-950">Priority Score</div>
          <p className="mt-1 whitespace-normal break-words text-sm font-normal leading-5 text-slate-500 normal-case">
            This is the remediation ranking score. It combines finding risk, asset
            context, and business importance to show what should be fixed first.
          </p>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

const BUSINESS_UNIT_FINDINGS_COLUMNS: Array<FindingsTableColumn<FindingsSortBy>> = [
  {
    id: "row-number",
    label: "#",
    widthClassName: "w-[72px]",
    headerClassName: "pr-4",
    cellClassName: "pr-4",
    render: (_finding, { absoluteIndex }) => absoluteIndex + 1,
  },
  {
    id: "status",
    label: "Status",
    widthClassName: "w-[132px]",
    sortField: "status",
    render: (finding) => {
      const normalizedStatus = normalizeFindingStatus(finding);
      return (
        <div className="flex items-center gap-2">
          <StatusBadge tone={normalizedStatus === "Fixed" ? "fixed" : "active"}>
            {normalizedStatus}
          </StatusBadge>
          {finding.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : null}
        </div>
      );
    },
  },
  {
    id: "finding",
    label: "Finding",
    cellClassName: "pl-5",
    headerClassName: "pl-5",
    render: (finding) => (
      <div className="font-medium text-slate-900">
        {finding.cve_id ?? getNormalizedFindingTitle(finding)}
      </div>
    ),
  },
  {
    id: "application",
    label: "Application",
    widthClassName: "w-[240px]",
    render: (finding) => finding.application || "—",
  },
  {
    id: "asset",
    label: "Asset",
    widthClassName: "w-[240px]",
    render: (finding) => finding.asset_name || finding.target_names || "—",
  },
  {
    id: "risk-score",
    label: "Risk Score",
    widthClassName: "w-[150px]",
    headerClassName: "border-l border-slate-200 pl-5 text-right",
    cellClassName: "border-l border-slate-200 pl-5 text-right",
    sortField: "risk_score",
    render: (finding) => (
      <span className="font-semibold text-slate-900">
        {formatNumber(finding.risk_score)}
      </span>
    ),
  },
  {
    id: "priority-score",
    label: <PriorityScoreLabel />,
    widthClassName: "w-[190px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortField: "priority_score",
    render: (finding) => {
      const priorityScore = finding.priority_score ?? finding.risk_score ?? null;
      const priorityBand = deriveRiskBand(priorityScore) ?? finding.risk_band;
      return (
        <div className="flex items-center justify-end gap-3">
          <span className="font-semibold text-slate-900">
            {formatNumber(priorityScore)}
          </span>
          {priorityBand ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${riskBandPillClass(
                priorityBand
              )}`}
            >
              {priorityBand}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "age",
    label: "Age",
    widthClassName: "w-[120px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortField: "age_in_days",
    render: (finding) => {
      if (finding.age_in_days === null || finding.age_in_days === undefined) {
        return <span className="text-slate-400">—</span>;
      }
      return (
        <span className="font-medium text-slate-700">
          {Math.round(finding.age_in_days).toLocaleString()}d
        </span>
      );
    },
  },
];

export function BusinessUnitDetailPage({
  businessUnitSlug,
  refreshToken,
  onOpenOverview,
  onOpenBusinessService,
  onOpenFinding,
}: BusinessUnitDetailPageProps) {
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>("All");
  const [sortBy, setSortBy] = useState<FindingsSortBy>("priority_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showKevOnly, setShowKevOnly] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | null>(null);

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
    data: findingsPage,
    loading: findingsLoading,
    error: findingsError,
    page: findingsPageNumber,
    setPage: setFindingsPage,
    pageSize: findingsPageSize,
  } = useBusinessUnitTopFindings(businessUnitSlug, {
    pageSize: FINDINGS_PAGE_SIZE,
    sortBy,
    sortOrder,
    riskBand: bandFilter === "All" ? null : bandFilter,
    search,
    refreshToken,
  });
  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSpinnerState message="Loading business unit" />
      </div>
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
  const findings = findingsPage?.items ?? [];
  const visibleFindings = showKevOnly
    ? findings.filter((finding) => Boolean(finding.isKev))
    : findings;
  const findingsTotal = findingsPage?.total ?? 0;
  const findingsTotalPages = Math.max(1, Math.ceil(findingsTotal / findingsPageSize));
  const findingsPageNumbers = getPaginationWindow({
    page: findingsPageNumber,
    totalPages: findingsTotalPages,
    windowSize: 3,
  });
  const findingsEmptyDescription =
    bandFilter === "All" && findingsTotal === 0
      ? "No findings are available for this business unit."
      : showKevOnly
        ? "No KEV findings on this page/filter."
        : "No findings available for this filter.";

  return (
    <div className="space-y-6">
      <EntityHero
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: businessUnit.business_unit },
        ]}
        label={businessUnit.company?.name ?? "Unassigned company"}
        title={businessUnit.business_unit}
        description={businessUnit.description}
        fallbackDescription="Live business-unit description is not available yet."
        showBackButton={false}
        showIdentityBadge={false}
        onBack={onOpenOverview}
      />

      <MetricGrid className="md:grid-cols-5">
        <MetricCard
          label="Risk Score"
          value={riskScore !== null ? formatNumber(riskScore) : "—"}
        />
        <MetricCard
          label="Business Services"
          value={businessUnit.metrics.total_business_services}
        />
        <MetricCard
          label="Applications"
          value={businessUnit.metrics.total_applications}
        />
        <MetricCard label="Assets" value={businessUnit.metrics.total_assets} />
        <MetricCard label="Findings" value={businessUnit.metrics.total_findings} />
      </MetricGrid>

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
              <BusinessServiceEntityCard
                key={businessService.slug}
                businessService={businessService}
                onOpen={() => onOpenBusinessService(businessService)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Findings in this Business Unit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            All vulnerability findings scoped to {businessUnit.business_unit}.
          </p>
        </div>
        <FindingsTable
          findings={visibleFindings}
          columns={BUSINESS_UNIT_FINDINGS_COLUMNS}
          loading={findingsLoading}
          error={findingsError}
          emptyTitle="No findings"
          emptyDescription={findingsEmptyDescription}
          searchValue={searchDraft}
          searchPlaceholder="Search finding, CVE, asset, application, status, or source"
          onSearchChange={setSearchDraft}
          onSearchSubmit={() => setSearch(searchDraft.trim() || null)}
          filters={[
            {
              id: "risk-band",
              label: "Risk band",
              value: bandFilter,
              options: RISK_BAND_OPTIONS.map((band) => ({ label: band, value: band })),
              onChange: (value) => setBandFilter(value as RiskBandFilter),
            },
            {
              id: "kev-only",
              label: "KEV",
              checked: showKevOnly,
              onChange: setShowKevOnly,
            },
          ]}
          sortOptions={SORT_OPTIONS}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onToggleSortOrder={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          pagination={{
            page: findingsPageNumber,
            pageSize: findingsPageSize,
            total: findingsTotal,
            pageNumbers: findingsPageNumbers,
            onPageChange: setFindingsPage,
          }}
          onOpenFinding={onOpenFinding}
          rowAriaLabel={(finding) => `Open ${getNormalizedFindingTitle(finding)}`}
          tableClassName="min-w-[1300px]"
        />
      </section>
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
  trend: BusinessUnitRiskTrendChartPoint[] | undefined;
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
      <ChartPanel
        title="Risk over time"
        description={`Showing risk trend for ${businessUnitName}`}
        loading={!hasRiskData && loading}
        error={!hasRiskData ? error : null}
        empty={!hasRiskData}
        emptyMessage="No risk trend data"
        loadingMessage="Loading risk data..."
        className="overflow-hidden"
        headerClassName="border-b border-slate-200 bg-slate-50/70 pb-4"
        contentClassName="pt-5"
        badge={
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight text-slate-950">
              {riskScore !== null ? riskScore : "No risk score data"}
            </div>
            <div className="text-xs font-medium text-slate-500">
              {riskBand ? `${riskBand} risk` : "No risk band data"}
            </div>
          </div>
        }
      >
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
      </ChartPanel>

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

function DetailEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
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
    </Empty>
  );
}

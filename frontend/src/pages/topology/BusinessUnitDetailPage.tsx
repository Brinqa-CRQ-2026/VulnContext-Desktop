import { Layers3 } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  BusinessServiceSummary,
  ScoredFinding,
} from "../../types";
import { useBusinessUnitDetail } from "../../hooks/topology/business-units/useBusinessUnitDetail";
import { useBusinessUnitRiskOverview } from "../../hooks/topology/business-units/useBusinessUnitRiskOverview";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../../components/ui/empty";
import { AssetDistributionChartCard } from "../../components/topology/AssetDistributionCharts";
import {
  type BusinessUnitRiskBand,
  type BusinessUnitRiskTrendChartPoint,
} from "../../components/topology/types";
import { ChartPanel } from "../../components/topology/shared/ChartPanel";
import { BusinessServiceEntityCard } from "../../components/topology/shared/EntityCard";
import { EntityHero } from "../../components/topology/shared/EntityHero";
import { MetricCard, MetricGrid } from "../../components/topology/shared/MetricCard";
import { LoadingSpinnerState } from "../../components/shared/LoadingSpinnerState";
import { BusinessUnitFindingsSection } from "./BusinessUnitFindingsSection";

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

const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "-");

export function BusinessUnitDetailPage({
  businessUnitSlug,
  refreshToken,
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

      <BusinessUnitFindingsSection
        businessUnitSlug={businessUnitSlug}
        businessUnitName={businessUnit.business_unit}
        refreshToken={refreshToken}
        onOpenFinding={onOpenFinding}
      />
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
        showCountBadge={false}
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

import { Layers3 } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  AssetTypeDistributionItem,
} from "../../api/types";
import { useBusinessServiceDetail } from "../../hooks/topology/useBusinessServiceDetail";
import type { ApplicationSummary, AssetSummary } from "../../api/types";
import { useBusinessServiceAnalytics } from "../../hooks/topology/useBusinessServiceAnalytics";
import { AssetInventoryPanel } from "./AssetInventoryPanel";
import {
  formatSlugLabel,
  TopologyPageSkeleton,
} from "./TopologyChrome";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { ChartPanel } from "./shared/ChartPanel";
import { ApplicationEntityCard } from "./shared/EntityCard";
import { EntityHero } from "./shared/EntityHero";
import { MetricCard, MetricGrid } from "./shared/MetricCard";

interface BusinessServiceDetailPageProps {
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessUnit: () => void;
  onOpenApplication: (application: ApplicationSummary) => void;
  onOpenAssetFindings: (asset: AssetSummary) => void;
}

export function BusinessServiceDetailPage({
  businessUnitSlug,
  businessServiceSlug,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessUnit,
  onOpenApplication,
  onOpenAssetFindings,
}: BusinessServiceDetailPageProps) {
  const { businessService, loading, error } = useBusinessServiceDetail(
    businessUnitSlug,
    businessServiceSlug,
    refreshToken
  );
  const {
    analytics: businessServiceAnalytics,
    loading: businessServiceAnalyticsLoading,
    error: businessServiceAnalyticsError,
  } = useBusinessServiceAnalytics(businessUnitSlug, businessServiceSlug, refreshToken);

  if (loading) {
    return (
      <TopologyPageSkeleton
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          {
            label: formatSlugLabel(businessUnitSlug, "Business Unit"),
            onClick: onOpenBusinessUnit,
          },
          { label: formatSlugLabel(businessServiceSlug, "Business Service") },
        ]}
        title="Loading business service"
        backLabel="Back to Business Unit"
        statCount={3}
        tableColumns={6}
      />
    );
  }

  if (error || !businessService) {
    return (
      <DetailEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Business service not found"
        }
        description={
          error ?? "The selected business service does not exist in the live topology."
        }
        onBack={onBack}
      />
    );
  }

  return (
    <div className="vc-page-stack">
      <EntityHero
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: businessService.business_unit, onClick: onOpenBusinessUnit },
          { label: businessService.business_service },
        ]}
        label={businessService.business_unit}
        title={businessService.business_service}
        description={businessService.description}
        fallbackDescription="Description for this business service will appear here when it is available."
        backLabel="Back"
        onBack={onBack}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Service Risk Score"
          value="8.4"
          valueClassName="text-rose-600"
        />
        <MetricCard
          label="Business Criticality"
          value="3/5"
          valueClassName="text-orange-500"
        />
        <MetricCard label="Total Applications" value={1} />
        <MetricCard label="Total Assets" value={37} />
        <MetricCard label="Total Findings" value={1132} />
      </MetricGrid>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <AssetCriticalityDistributionCard
          businessService={businessService.business_service}
          distribution={businessServiceAnalytics?.asset_criticality_distribution ?? null}
          loading={businessServiceAnalyticsLoading}
          error={businessServiceAnalyticsError}
        />
        <AssetTypeDistributionCard
          businessService={businessService.business_service}
          assetTypes={businessServiceAnalytics?.asset_type_distribution ?? []}
          loading={businessServiceAnalyticsLoading}
          error={businessServiceAnalyticsError}
        />
        <FindingRiskSpreadPlaceholder
          loading={businessServiceAnalyticsLoading}
          error={businessServiceAnalyticsError}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Applications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Click an application to inspect its assets and scoped findings.
          </p>
        </div>

        {businessService.applications.length === 0 ? (
          <Empty className="min-h-[12rem]">
            <EmptyHeader>
              <EmptyTitle>No applications</EmptyTitle>
              <EmptyDescription>
                This business service currently has no application drill-down rows.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {businessService.applications.map((application) => (
              <ApplicationEntityCard
                key={application.slug}
                application={application}
                onOpen={() => onOpenApplication(application)}
              />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-[0.16em] text-slate-500">
            Direct Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetInventoryPanel
            businessUnit={businessService.business_unit}
            businessService={businessService.business_service}
            directOnly
            refreshToken={refreshToken}
            onOpenAsset={onOpenAssetFindings}
          />
        </CardContent>
      </Card>
    </div>
  );
}

const severityChartConfig = {
  critical: { label: "Critical", color: "#dc2626" },
  high: { label: "High", color: "#f97316" },
  medium: { label: "Medium", color: "#f59e0b" },
  low: { label: "Low", color: "#22c55e" },
  unscored: { label: "Unscored", color: "#94a3b8" },
} satisfies ChartConfig;

const assetTypeChartConfig = {
  count: {
    label: "Assets",
    color: "#2563eb",
  },
} satisfies ChartConfig;

function AssetCriticalityDistributionCard({
  businessService,
  distribution,
  loading,
  error,
}: {
  businessService: string;
  distribution: AssetScoreDistribution | null;
  loading: boolean;
  error: string | null;
}) {
  const chartData = useMemo(() => toCriticalityPieRows(distribution), [distribution]);
  const legendData = useMemo(() => toCriticalityLegendRows(distribution), [distribution]);

  return (
    <ChartPanel
      title="Asset Criticality Distribution"
      description={`All assets under ${businessService}`}
      loading={loading}
      error={error}
      empty={chartData.length === 0}
      emptyMessage="No assets available."
      loadingMessage="Loading distribution…"
      headerClassName="pb-3"
      titleClassName="text-sm text-slate-700"
      contentClassName="min-h-[220px]"
      placeholderClassName="h-[180px] min-h-0 rounded-lg border-slate-200 bg-slate-50/60 text-slate-500"
      errorPlaceholderClassName="h-[180px] min-h-0 rounded-lg border-rose-200 bg-rose-50 text-rose-700"
    >
      <ChartContainer
        config={severityChartConfig}
        className="mx-auto h-[180px] w-full"
      >
        <PieChart>
          <Pie data={chartData} dataKey="count" nameKey="key" outerRadius={58} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent nameKey="key" hideLabel />}
          />
          <ChartLegend
            payload={legendData}
            content={<ChartLegendContent nameKey="key" />}
            className="flex-nowrap justify-center gap-4 pt-4 text-xs"
          />
        </PieChart>
      </ChartContainer>
    </ChartPanel>
  );
}

function AssetTypeDistributionCard({
  businessService,
  assetTypes,
  loading,
  error,
}: {
  businessService: string;
  assetTypes: AssetTypeDistributionItem[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <ChartPanel
      title="Asset Type Distribution"
      description={`Top 5 asset types under ${businessService}`}
      loading={loading}
      error={error}
      empty={assetTypes.length === 0}
      emptyMessage="No assets available."
      loadingMessage="Loading asset types…"
      headerClassName="pb-3"
      titleClassName="text-sm text-slate-700"
      contentClassName="min-h-[220px]"
      placeholderClassName="h-[180px] min-h-0 rounded-lg border-slate-200 bg-slate-50/60 text-slate-500"
      errorPlaceholderClassName="h-[180px] min-h-0 rounded-lg border-rose-200 bg-rose-50 text-rose-700"
    >
      <ChartContainer config={assetTypeChartConfig} className="h-[180px] w-full">
        <BarChart accessibilityLayer data={assetTypes}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval={0}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={6} />
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  );
}

function FindingRiskSpreadPlaceholder({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  return (
    <ChartPanel
      title="Finding Risk Spread"
      description="Finding risk distribution for this business service"
      loading={loading}
      error={error}
      empty
      emptyMessage="Finding risk distribution is not available yet."
      loadingMessage="Loading finding risk spread..."
      headerClassName="pb-3"
      titleClassName="text-sm text-slate-700"
      contentClassName="min-h-[220px]"
      placeholderClassName="h-[180px] min-h-0 rounded-lg border-slate-200 bg-slate-50/60 text-slate-500"
      errorPlaceholderClassName="h-[180px] min-h-0 rounded-lg border-rose-200 bg-rose-50 text-rose-700"
    >
      <div />
    </ChartPanel>
  );
}

function toCriticalityPieRows(distribution: AssetScoreDistribution | null) {
  if (!distribution) {
    return [];
  }

  return [
    { key: "critical", count: distribution.critical, fill: "var(--color-critical)" },
    { key: "high", count: distribution.high, fill: "var(--color-high)" },
    { key: "medium", count: distribution.medium, fill: "var(--color-medium)" },
    { key: "low", count: distribution.low, fill: "var(--color-low)" },
    { key: "unscored", count: distribution.unscored, fill: "var(--color-unscored)" },
  ].filter((row) => row.count > 0);
}

function toCriticalityLegendRows(distribution: AssetScoreDistribution | null) {
  const rows = [
    { key: "critical", value: "critical", color: "var(--color-critical)", type: "square" as const },
    { key: "high", value: "high", color: "var(--color-high)", type: "square" as const },
    { key: "medium", value: "medium", color: "var(--color-medium)", type: "square" as const },
    { key: "low", value: "low", color: "var(--color-low)", type: "square" as const },
  ];

  if ((distribution?.unscored ?? 0) > 0) {
    rows.push({
      key: "unscored",
      value: "unscored",
      color: "var(--color-unscored)",
      type: "square" as const,
    });
  }

  return rows;
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
        Back to Business Unit
      </Button>
    </Empty>
  );
}

function isTopologyUnavailable(message: string | null) {
  return (message ?? "").toLowerCase().includes("normalized topology");
}

import { Layers3 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  AssetTypeDistributionItem,
} from "../../types";
import {
  toAssetCriticalityLegendRows,
  toAssetCriticalityPieRows,
} from "../../lib/charts/assetDistribution";
import { formatNumber } from "../../lib/formatting/numbers";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { useBusinessServiceDetail } from "../../hooks/topology/business-services/useBusinessServiceDetail";
import type { ApplicationSummary, AssetSummary } from "../../types";
import { useBusinessServiceAnalytics } from "../../hooks/topology/business-services/useBusinessServiceAnalytics";
import { predictBusinessServiceFairLoss } from "../../api/topology";
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
import { FairScopeLossPanel } from "../fair/FairScopeLossPanel";

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
  const predictFairLoss = useCallback(
    (payload: Parameters<typeof predictBusinessServiceFairLoss>[2]) =>
      predictBusinessServiceFairLoss(
        businessUnitSlug ?? "",
        businessServiceSlug ?? "",
        payload
      ),
    [businessServiceSlug, businessUnitSlug]
  );

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

  const serviceRiskScore =
    businessService.risk_score ?? businessServiceAnalytics?.service_risk_score;
  const businessCriticalityScore =
    businessService.business_criticality_score ??
    businessServiceAnalytics?.business_criticality_score;

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
          value={formatNumber(serviceRiskScore)}
          valueClassName="text-rose-600"
        />
        <MetricCard
          label="Business Criticality"
          value={
            businessCriticalityScore !== null && businessCriticalityScore !== undefined
              ? `${businessCriticalityScore}/5`
              : "-"
          }
          valueClassName="text-orange-500"
        />
        <MetricCard
          label="Total Applications"
          value={businessService.metrics.total_applications}
        />
        <MetricCard label="Total Assets" value={businessService.metrics.total_assets} />
        <MetricCard
          label="Total Findings"
          value={businessService.metrics.total_findings}
        />
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

      {businessUnitSlug && businessServiceSlug ? (
        <FairScopeLossPanel
          title="Business Service FAIR Loss Exposure"
          description="Estimates annualized loss exposure for this business service. Applications, assets, and findings act as likelihood drivers, while the service carries the monetary business impact."
          onPredict={predictFairLoss}
        />
      ) : null}

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
  const chartData = useMemo(() => toAssetCriticalityPieRows(distribution), [distribution]);
  const legendData = useMemo(() => toAssetCriticalityLegendRows(distribution), [distribution]);

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

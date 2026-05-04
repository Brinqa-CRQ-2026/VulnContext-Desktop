import { Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";

import type {
  AssetScoreDistribution,
  AssetTypeDistributionItem,
} from "../../api/types";
import { useBusinessServiceDetail } from "../../hooks/topology/useBusinessServiceDetail";
import type { ApplicationSummary, AssetSummary } from "../../api/types";
import { useBusinessServiceAnalytics } from "../../hooks/topology/useBusinessServiceAnalytics";
import {
  type ApplicationSortKey,
  ApplicationsDrillDownTable,
  type SortState,
} from "./DrillDownTables";
import { AssetInventoryPanel } from "./AssetInventoryPanel";
import {
  formatSlugLabel,
  TopologyBreadcrumbs,
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
import { getBusinessServicePageMockData } from "./businessServicePageMockData";

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
  const [applicationSort, setApplicationSort] = useState<SortState<ApplicationSortKey>>({
    key: "finding_count",
    order: "desc",
  });
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
  const pageMock = getBusinessServicePageMockData(businessServiceSlug);

  const businessCriticalityValue =
    businessServiceAnalytics?.business_criticality_score != null
      ? `${businessServiceAnalytics.business_criticality_score}/${businessServiceAnalytics.business_criticality_max}`
      : pageMock.businessCriticality;
  const totals = businessServiceAnalytics?.totals ?? {
    applications: businessService?.metrics.total_applications ?? 0,
    assets: businessService?.metrics.total_assets ?? 0,
    findings: businessService?.metrics.total_findings ?? 0,
  };

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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch">
        <Card className="h-full">
          <CardHeader className="gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <TopologyBreadcrumbs
                items={[
                  { label: "Business Units", onClick: onOpenOverview },
                  { label: businessService.business_unit, onClick: onOpenBusinessUnit },
                  { label: businessService.business_service },
                ]}
              />
              <Button variant="outline" onClick={onBack}>
                Back to Business Unit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <p className="vc-eyebrow">
                  {businessService.company?.name ?? "Unassigned company"}
                </p>
                <CardTitle className="vc-entity-title mt-2">
                  {businessService.business_service}
                </CardTitle>
                <p className="vc-context-line mt-1">
                  Business unit: {businessService.business_unit}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                <div className="vc-eyebrow">Description</div>
                <p className="mt-2 text-base leading-7 text-slate-900">
                  {businessService.description?.trim()
                    || "Description for this business service will appear here when it is available."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full max-w-[420px] gap-4 xl:h-full xl:w-[420px] xl:max-w-[420px] xl:flex-none xl:grid-rows-2">
          <KpiCard
            label="Service Risk Score"
            value={pageMock.serviceRiskScore}
            valueClassName="text-rose-600"
          />
          <KpiCard
            label="Business Criticality"
            value={businessCriticalityValue}
            valueClassName="text-orange-500"
          />
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-[300px_repeat(3,minmax(0,1fr))]">
        <div className="grid min-h-[220px] max-w-[300px] grid-rows-3 gap-3">
          <InfoTile label="Total Applications" value={totals.applications} />
          <InfoTile label="Total Assets" value={totals.assets} />
          <InfoTile label="Total Findings" value={totals.findings} />
        </div>
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
        <Card>
          <CardContent className="min-h-[220px]" />
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-[0.16em] text-slate-500">
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <ApplicationsDrillDownTable
              applications={businessService.applications}
              sort={applicationSort}
              onSortChange={setApplicationSort}
              onOpenApplication={onOpenApplication}
            />
          )}
        </CardContent>
      </Card>

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

function KpiCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <Card className="h-full w-full max-w-[420px]">
      <CardContent className="grid h-full min-h-[84px] grid-cols-[minmax(126px,1fr)_auto] items-center gap-2 p-4">
        <div className="vc-kpi-label max-w-[8.5rem]">
          {label}
        </div>
        <div className={`vc-kpi-value justify-self-end text-right ${valueClassName}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-700">
          Asset Criticality Distribution
        </CardTitle>
        <p className="text-sm text-slate-500">All assets under {businessService}</p>
      </CardHeader>
      <CardContent className="min-h-[220px]">
        {loading ? (
          <PanelPlaceholder>Loading distribution…</PanelPlaceholder>
        ) : error ? (
          <PanelPlaceholder tone="error">{error}</PanelPlaceholder>
        ) : chartData.length === 0 ? (
          <PanelPlaceholder>No assets available.</PanelPlaceholder>
        ) : (
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
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-700">Asset Type Distribution</CardTitle>
        <p className="text-sm text-slate-500">Top 5 asset types under {businessService}</p>
      </CardHeader>
      <CardContent className="min-h-[220px]">
        {loading ? (
          <PanelPlaceholder>Loading asset types…</PanelPlaceholder>
        ) : error ? (
          <PanelPlaceholder tone="error">{error}</PanelPlaceholder>
        ) : assetTypes.length === 0 ? (
          <PanelPlaceholder>No assets available.</PanelPlaceholder>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="h-full">
      <CardContent className="grid h-full grid-cols-[minmax(104px,1fr)_auto] items-center gap-2 px-3 py-4">
        <div className="vc-kpi-label max-w-[7rem] text-slate-700">{label}</div>
        <div className="w-full min-w-[72px] justify-self-end text-right text-2xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelPlaceholder({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`flex h-[180px] items-center justify-center rounded-lg border border-dashed text-sm ${
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50/60 text-slate-500"
      }`}
    >
      {children}
    </div>
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

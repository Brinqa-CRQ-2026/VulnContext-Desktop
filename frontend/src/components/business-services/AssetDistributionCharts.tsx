import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import type { AssetAnalyticsResponse, AssetScoreDistribution } from "../../api/types";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

const chartConfig = {
  count: {
    label: "Assets",
    color: "#00af66",
  },
  label: {
    label: "Band",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig;

interface AssetDistributionChartsProps {
  analytics: AssetAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
}

export function AssetDistributionCharts({
  analytics,
  loading,
  error,
}: AssetDistributionChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AssetDistributionChartCard
        title="Asset criticality spread"
        description="CRQ context score distribution for the full filtered asset set"
        distribution={analytics?.asset_criticality_distribution ?? null}
        totalCount={analytics?.total_assets ?? 0}
        countUnit="assets"
        loading={loading}
        error={error}
      />
      <AssetDistributionChartCard
        title="Finding risk spread"
        description="Aggregated finding risk distribution for the full filtered asset set"
        distribution={analytics?.finding_risk_distribution ?? null}
        totalCount={analytics?.total_assets ?? 0}
        countUnit="assets"
        loading={loading}
        error={error}
      />
    </div>
  );
}

export function AssetDistributionChartCard({
  title,
  description,
  distribution,
  totalCount,
  countUnit,
  loading,
  error,
}: {
  title: string;
  description: string;
  distribution: AssetScoreDistribution | null;
  totalCount: number;
  countUnit: string;
  loading: boolean;
  error: string | null;
}) {
  const chartData = toChartRows(distribution);
  const hasData = chartData.some((row) => row.count > 0);

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-2 border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(240,253,244,0.85))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-900">{title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {totalCount.toLocaleString()} {countUnit}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {loading ? (
          <ChartPlaceholder>Loading distribution…</ChartPlaceholder>
        ) : error ? (
          <ChartPlaceholder tone="error">{error}</ChartPlaceholder>
        ) : !hasData ? (
          <ChartPlaceholder>No assets match the current filters.</ChartPlaceholder>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{ left: 20, right: 32, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={72}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip
                  cursor={{ fill: "rgba(0, 175, 102, 0.08)" }}
                  content={<ChartTooltipContent indicator="line" hideLabel />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={10}
                    className="fill-slate-700"
                    fontSize={12}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="sr-only">
              {chartData.map((row) => (
                <li key={row.key}>{`${row.label} ${row.count}`}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChartPlaceholder({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "flex h-[260px] items-center justify-center rounded-xl border border-dashed text-sm",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50/70 text-slate-500"
      )}
    >
      {children}
    </div>
  );
}

function toChartRows(distribution: AssetScoreDistribution | null) {
  if (!distribution) {
    return [];
  }

  const rows = [
    { key: "critical", label: "Critical", count: distribution.critical },
    { key: "high", label: "High", count: distribution.high },
    { key: "medium", label: "Medium", count: distribution.medium },
    { key: "low", label: "Low", count: distribution.low },
  ];

  if (distribution.unscored > 0) {
    rows.push({ key: "unscored", label: "Unscored", count: distribution.unscored });
  }

  return rows;
}

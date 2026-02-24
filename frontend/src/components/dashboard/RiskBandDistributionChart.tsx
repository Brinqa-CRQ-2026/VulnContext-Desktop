"use client";

import { Pie, PieChart } from "recharts";

import type { ScoresSummary } from "../../api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface RiskBandDistributionChartProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

export const description = "A pie chart with a legend";

const chartConfig = {
  visitors: {
    label: "Findings",
  },
  critical: {
    label: "Critical",
    color: "#e11d48",
  },
  high: {
    label: "High",
    color: "#f97316",
  },
  medium: {
    label: "Medium",
    color: "#f59e0b",
  },
  low: {
    label: "Low",
    color: "#16a34a",
  },
} satisfies ChartConfig;

export function RiskBandDistributionChart({
  summary,
  loading,
}: RiskBandDistributionChartProps) {
  const bands = summary?.risk_bands;

  const chartData = [
    { band: "critical", visitors: bands?.Critical ?? 0, fill: "var(--color-critical)" },
    { band: "high", visitors: bands?.High ?? 0, fill: "var(--color-high)" },
    { band: "medium", visitors: bands?.Medium ?? 0, fill: "var(--color-medium)" },
    { band: "low", visitors: bands?.Low ?? 0, fill: "var(--color-low)" },
  ];

  const total = chartData.reduce((sum, item) => sum + item.visitors, 0);
  const hasData = total > 0;

  return (
    <Card className="flex h-[420px] w-full max-w-[420px] flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Risk Band Distribution</CardTitle>
        <CardDescription>Across all findings currently in the database</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0">
        {loading && !summary ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
            Loading risk band distribution...
          </div>
        ) : !hasData ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
            No findings available yet.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-full w-full max-h-[300px]"
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="visitors"
                nameKey="band"
                minAngle={5}
                stroke="none"
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="band" />}
                className="-translate-y-2 grid grid-cols-2 gap-x-4 gap-y-2 justify-items-center"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { useRiskOverTime } from "../../hooks/useScoresData";

const chartConfig = {
  total_risk: {
    label: "Total remaining risk",
    color: "#ef4444",
  },
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function RiskOverTimeChart() {
  const { data, loading, error } = useRiskOverTime(30);
  if (loading || !data) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            TOTAL RISK OVER TIME (LAST 30 DAYS)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center">
          <p className="text-xs text-slate-400">
            {loading ? "Loading chart..." : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            TOTAL RISK OVER TIME (LAST 30 DAYS)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center">
          <p className="text-xs text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.points.map((point) => ({
    ...point,
    date_label: formatDateLabel(point.date),
  }));

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-slate-500">
          TOTAL RISK OVER TIME (LAST 30 DAYS)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDateLabel(String(label))}
                  formatter={(value, name, item) => {
                    if (name === "total_risk") {
                      return (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-muted-foreground">Total risk</span>
                          <span className="font-mono text-foreground">
                            {Number(value).toFixed(1)}
                          </span>
                        </div>
                      );
                    }

                    if (name === "resolved_count") {
                      return (
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-muted-foreground">Findings resolved</span>
                          <span className="font-mono text-foreground">
                            {Number(value).toLocaleString()}
                          </span>
                        </div>
                      );
                    }

                    return null;
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="total_risk"
              name="total_risk"
              stroke="var(--color-total_risk)"
              fill="var(--color-total_risk)"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

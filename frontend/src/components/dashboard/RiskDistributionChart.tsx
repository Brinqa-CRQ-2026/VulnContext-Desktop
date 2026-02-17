import React from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip, Label } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ScoresSummary } from "../../api";

interface RiskDistributionChartProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

const COLORS = {
  critical: "#f43f5e", // rose-500
  high: "#fb923c",    // orange-400
  medium: "#fbbf24",  // amber-400
  low: "#10b981",     // emerald-500
};

export function RiskDistributionChart({
  summary,
  loading,
}: RiskDistributionChartProps) {
  console.log("🎨 RiskDistributionChart rendered:", { summary, loading });
  
  const bands = summary?.risk_bands;
  console.log("📊 Risk bands data:", bands);

  if (loading || !bands) {
    console.log("⚠️ Chart not rendering - loading:", loading, "bands:", bands);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            RISK DISTRIBUTION
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-xs text-slate-400">
            {loading ? "Loading chart..." : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    {
      name: "Critical",
      value: bands.Critical,
      color: COLORS.critical,
    },
    {
      name: "High",
      value: bands.High,
      color: COLORS.high,
    },
    {
      name: "Medium",
      value: bands.Medium,
      color: COLORS.medium,
    },
    {
      name: "Low",
      value: bands.Low,
      color: COLORS.low,
    },
  ];

  const totalFindings = chartData.reduce((acc, curr) => acc + curr.value, 0);
  console.log("✅ Chart data prepared:", chartData, "total:", totalFindings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-slate-500">
          RISK DISTRIBUTION
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={{
                stroke: "#94a3b8",
                strokeWidth: 1,
              }}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 20;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#334155"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize="11px"
                    fontWeight="500"
                  >
                    {`${name}: ${value}`}
                  </text>
                );
              }}
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => value.toLocaleString()}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "8px 12px",
                fontSize: "12px"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
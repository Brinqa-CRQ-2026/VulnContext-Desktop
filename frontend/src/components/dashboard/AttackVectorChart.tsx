import React, { useEffect, useState } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getAttackVectorDistribution, AttackVectorCount } from "../../api";

const COLORS: Record<string, string> = {
  NETWORK: "#ef4444", // red-500
  ADJACENT_NETWORK: "#f97316", // orange-500
  LOCAL: "#eab308", // yellow-500
  PHYSICAL: "#8b5cf6", // violet-500
  Unknown: "#64748b", // slate-500
};

export function AttackVectorChart() {
  const [data, setData] = useState<AttackVectorCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getAttackVectorDistribution();
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load attack vector data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Attack Vectors
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[320px] items-center justify-center">
          <p className="text-xs text-slate-400">
            {loading ? "Loading chart..." : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Attack Vectors
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[320px] items-center justify-center">
          <p className="text-xs text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.attack_vector,
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <Card className="shadow-md border-slate-200/60">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Attack Vectors
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
              label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percentage }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 20;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#334155"
                    textAnchor={x > cx ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize="11px"
                    fontWeight="500"
                  >
                    {`${name}: ${value} (${percentage}%)`}
                  </text>
                );
              }}
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name] || COLORS.Unknown}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} (${props.payload.percentage}%)`,
                name,
              ]}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

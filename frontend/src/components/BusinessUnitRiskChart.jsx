import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { businessUnits } from "../data/mockData";

function riskColor(score) {
  if (score >= 85) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 55) return "#eab308";
  return "#22d3ee";
}

export default function BusinessUnitRiskChart() {
  const sorted = [...businessUnits].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Risk Score by Business Unit</h3>
        <span className="chart-badge">0–100 scale</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={sorted} layout="vertical" barSize={18} margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3148" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1e2030", border: "1px solid #2e3148", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(v) => [`${v} / 100`, "Risk Score"]}
          />
          <Bar dataKey="riskScore" radius={[0, 4, 4, 0]}>
            {sorted.map((entry) => (
              <Cell key={entry.id} fill={riskColor(entry.riskScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { assetTypeBreakdown } from "../data/mockData";

export default function AssetTypeChart() {
  const total = assetTypeBreakdown.reduce((s, d) => s + d.count, 0);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Assets by Type</h3>
        <span className="chart-badge">{total.toLocaleString()} total</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={assetTypeBreakdown} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3148" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1e2030", border: "1px solid #2e3148", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {assetTypeBreakdown.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { findingTrend } from "../data/mockData";

export default function FindingTrendChart() {
  return (
    <div className="chart-card chart-wide">
      <div className="chart-header">
        <h3>Finding Trend (7 months)</h3>
        <span className="chart-badge">Active findings over time</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={findingTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3148" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1e2030", border: "1px solid #2e3148", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
          <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
          <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: "#eab308" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

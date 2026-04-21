import { applications } from "../data/mockData";

function riskColor(score) {
  if (score >= 85) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 55) return "#eab308";
  return "#22d3ee";
}

export default function ApplicationRiskTable() {
  const sorted = [...applications].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Applications at Risk</h3>
        <span className="chart-badge">Top 6 by risk score</span>
      </div>
      <div className="app-table">
        {sorted.map((app) => {
          const color = riskColor(app.riskScore);
          return (
            <div className="app-row" key={app.id}>
              <div className="app-row-left">
                <div className="app-score-ring" style={{ "--ring-color": color }}>
                  {app.riskScore}
                </div>
                <div>
                  <div className="app-name">{app.name}</div>
                  <div className="app-meta">{app.assetCount} assets · {app.env}</div>
                </div>
              </div>
              <div className="app-findings" style={{ color }}>
                {app.findingCount} findings
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { assets, businessUnits, assetTypeColors } from "../data/mockData";
import { generateAssetsForApp, getFindingsForAssets } from "../data/generateFindings";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Breadcrumb from "../components/Breadcrumb";
import FindingCard from "../components/FindingCard";

function riskColor(score) {
  if (score >= 85) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 55) return "#eab308";
  return "#22d3ee";
}

const cloudIcons = { AWS: "☁", GCP: "☁", Azure: "☁", "On-Prem": "⬛" };

const SEV_COLORS = { Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#3b82f6" };

export default function ApplicationView({ app, service, company, onSelectAsset, onNavigate }) {
  const [tab, setTab] = useState("assets");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const realAssets = assets.filter((a) => a.appId === app.id);
  const myAssets = generateAssetsForApp(app, realAssets);
  const bu = businessUnits.find((b) => b.id === service.buId);

  // Asset type chart data
  const typeMap = {};
  myAssets.forEach((a) => { typeMap[a.type] = (typeMap[a.type] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, count]) => ({
    name, count, color: assetTypeColors[name] || "#6366f1",
  }));

  // All findings across every asset (real or synthetic)
  const allFindings = getFindingsForAssets(myAssets);
  const filteredFindings = allFindings.filter((f) => {
    if (severityFilter !== "All" && f.severity !== severityFilter) return false;
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    return true;
  });

  // Severity counts for the findings tab badge row
  const sevCounts = ["Critical", "High", "Medium", "Low"].map((s) => ({
    label: s,
    count: allFindings.filter((f) => f.severity === s).length,
    color: SEV_COLORS[s],
  }));

  const crumbs = [
    { label: "Organizations", target: { view: "companies" } },
    { label: company.name, target: { view: "company", company } },
    { label: service.name, target: { view: "service", service, company } },
    { label: app.name },
  ];

  return (
    <div className="view application-view">
      <Breadcrumb crumbs={crumbs} onNavigate={onNavigate} />

      <div className="view-intro">
        <h1 className="view-title">{app.name}</h1>
        <p className="view-desc">
          {service.name} · {bu?.name} · {app.env} · {myAssets.length} assets · {app.findingCount} findings
        </p>
      </div>

      {/* Overview panels */}
      <div className="app-detail-grid">
        <div className="detail-panel">
          <div className="panel-label">Assets by Type</div>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3148" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e2030", border: "1px solid #2e3148", borderRadius: 8 }} itemStyle={{ color: "#e2e8f0" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {typeData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No assets linked in mock data.</div>
          )}
        </div>

        <div className="detail-panel stats-panel">
          <div className="panel-label">Application Overview</div>
          <div className="stat-rows">
            <div className="stat-row"><span>Risk Score</span><span style={{ color: riskColor(app.riskScore), fontWeight: 700 }}>{app.riskScore} / 100</span></div>
            <div className="stat-row"><span>Total Assets</span><span>{app.assetCount}</span></div>
            <div className="stat-row"><span>Total Findings</span><span>{app.findingCount}</span></div>
            <div className="stat-row"><span>Critical</span><span style={{ color: "#ef4444", fontWeight: 600 }}>{myAssets.reduce((s, a) => s + a.criticalFindings, 0)}</span></div>
            <div className="stat-row"><span>Environment</span><span className="env-pill">{app.env}</span></div>
            <div className="stat-row"><span>Tags</span>
              <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {app.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === "assets" ? "active" : ""}`}
          onClick={() => setTab("assets")}
        >
          Assets
          <span className="tab-count">{myAssets.length}</span>
        </button>
        <button
          className={`tab-btn ${tab === "findings" ? "active" : ""}`}
          onClick={() => setTab("findings")}
        >
          All Findings
          <span className="tab-count" style={{ background: allFindings.some(f => f.severity === "Critical") ? "rgba(239,68,68,0.2)" : undefined, color: allFindings.some(f => f.severity === "Critical") ? "#ef4444" : undefined }}>
            {app.findingCount}
          </span>
        </button>
      </div>

      {/* ── Assets tab ── */}
      {tab === "assets" && (
        <div className="asset-list">
          {myAssets.length === 0 && <div className="empty-state">No assets are linked to this application in mock data.</div>}
          {myAssets.map((ast) => (
            <button key={ast.id} className="asset-row" onClick={() => onSelectAsset(ast)}>
              <div
                className="asset-type-badge"
                style={{ background: `color-mix(in srgb, ${assetTypeColors[ast.type] || "#6366f1"} 15%, transparent)`, color: assetTypeColors[ast.type] || "#6366f1" }}
              >
                {ast.type}
              </div>
              <div className="asset-main">
                <div className="asset-hostname">{ast.hostname}</div>
                <div className="asset-meta">
                  {ast.ip && <span>{ast.ip}</span>}
                  <span>{ast.os}</span>
                  <span>{cloudIcons[ast.cloud] || "☁"} {ast.cloud} · {ast.region}</span>
                </div>
              </div>
              <div className="asset-right">
                <div className="asset-findings-count">
                  <span className="asset-findings-label">Findings</span>
                  <span className="asset-findings-num">{ast.findingCount}</span>
                </div>
                {ast.criticalFindings > 0 && (
                  <div className="asset-critical" style={{ color: "#ef4444" }}>{ast.criticalFindings} critical</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Findings tab ── */}
      {tab === "findings" && (
        <div>
          {/* Severity summary pills */}
          <div className="findings-sev-row">
            {sevCounts.map(({ label, count, color }) => (
              <button
                key={label}
                className={`sev-filter-pill ${severityFilter === label ? "selected" : ""}`}
                style={{ "--pill-color": color }}
                onClick={() => setSeverityFilter(severityFilter === label ? "All" : label)}
              >
                <span className="sev-filter-dot" style={{ background: color }} />
                {label}
                <span className="sev-filter-count">{count}</span>
              </button>
            ))}
            {severityFilter !== "All" && (
              <button className="clear-filter" onClick={() => setSeverityFilter("All")}>Clear ✕</button>
            )}
          </div>

          {/* Status filter row */}
          <div className="status-filter-row">
            {["All", "Open", "In Progress", "Remediated"].map((s) => (
              <button
                key={s}
                className={`status-filter-btn ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
                {s !== "All" && (
                  <span className="status-filter-count">
                    {allFindings.filter(f => f.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="findings-list">
            {filteredFindings.length === 0 && (
              <div className="empty-state">No findings match the selected filters.</div>
            )}
            {filteredFindings.map((f, i) => (
              <FindingCard key={f.id ?? i} finding={f} showAsset />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

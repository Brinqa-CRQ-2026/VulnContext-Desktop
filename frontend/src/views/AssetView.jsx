import { useState } from "react";
import { businessUnits } from "../data/mockData";
import { getFindingsForAsset } from "../data/generateFindings";
import Breadcrumb from "../components/Breadcrumb";
import FindingCard from "../components/FindingCard";

const SEV_COLORS = { Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#3b82f6" };

export default function AssetView({ asset, app, service, company, onNavigate }) {
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const bu = businessUnits.find((b) => b.id === service.buId);
  const allFindings = getFindingsForAsset(asset);

  const filteredFindings = allFindings.filter((f) => {
    if (severityFilter !== "All" && f.severity !== severityFilter) return false;
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    return true;
  });

  const sevCounts = ["Critical", "High", "Medium", "Low"].map((s) => ({
    label: s,
    count: allFindings.filter((f) => f.severity === s).length,
    color: SEV_COLORS[s],
  }));

  const crumbs = [
    { label: "Organizations", target: { view: "companies" } },
    { label: company.name, target: { view: "company", company } },
    { label: service.name, target: { view: "service", service, company } },
    { label: app.name, target: { view: "application", app, service, company } },
    { label: asset.hostname },
  ];

  return (
    <div className="view asset-view">
      <Breadcrumb crumbs={crumbs} onNavigate={onNavigate} />

      <div className="view-intro">
        <h1 className="view-title">{asset.hostname}</h1>
        <p className="view-desc">
          {asset.type} · {asset.os} · {asset.cloud} {asset.region}
          {asset.ip ? ` · ${asset.ip}` : ""}
        </p>
      </div>

      <div className="asset-detail-grid">
        <div className="detail-panel stats-panel">
          <div className="panel-label">Asset Details</div>
          <div className="stat-rows">
            <div className="stat-row"><span>Type</span><span>{asset.type}</span></div>
            <div className="stat-row"><span>Hostname</span><span style={{ fontFamily: "monospace", fontSize: 12 }}>{asset.hostname}</span></div>
            {asset.ip && <div className="stat-row"><span>IP Address</span><span style={{ fontFamily: "monospace", fontSize: 12 }}>{asset.ip}</span></div>}
            <div className="stat-row"><span>OS</span><span>{asset.os}</span></div>
            <div className="stat-row"><span>Cloud / Region</span><span>{asset.cloud} · {asset.region}</span></div>
            <div className="stat-row"><span>Application</span><span>{app.name}</span></div>
            <div className="stat-row"><span>Service</span><span>{service.name}</span></div>
          </div>
        </div>

        <div className="detail-panel stats-panel">
          <div className="panel-label">Finding Summary</div>
          <div className="stat-rows">
            <div className="stat-row"><span>Total Findings</span><span>{allFindings.length}</span></div>
            <div className="stat-row"><span>Critical</span><span style={{ color: "#ef4444", fontWeight: 700 }}>{sevCounts[0].count}</span></div>
            <div className="stat-row"><span>High</span><span style={{ color: "#f97316" }}>{sevCounts[1].count}</span></div>
            <div className="stat-row"><span>Medium</span><span style={{ color: "#eab308" }}>{sevCounts[2].count}</span></div>
            <div className="stat-row"><span>Low</span><span style={{ color: "#3b82f6" }}>{sevCounts[3].count}</span></div>
            <div className="stat-row"><span>Open</span><span style={{ color: "#ef4444" }}>{allFindings.filter(f => f.status === "Open").length}</span></div>
            <div className="stat-row"><span>Remediated</span><span style={{ color: "#22d3ee" }}>{allFindings.filter(f => f.status === "Remediated").length}</span></div>
          </div>
        </div>
      </div>

      {/* Severity filter pills */}
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

      {/* Status filter */}
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

      <div className="section-label">
        Vulnerability Findings ({filteredFindings.length}{filteredFindings.length !== allFindings.length ? ` of ${allFindings.length}` : ""})
      </div>

      <div className="findings-list">
        {filteredFindings.length === 0 && (
          <div className="empty-state">No findings match the selected filters.</div>
        )}
        {filteredFindings.map((f, i) => (
          <FindingCard key={f.id ?? i} finding={f} />
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { businessUnits, businessServices, applications } from "../data/mockData";

function riskBadgeColor(score) {
  if (score >= 85) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 55) return "#eab308";
  return "#22d3ee";
}

export default function HierarchyPanel() {
  const [expandedBU, setExpandedBU] = useState("bu-005");
  const [expandedBS, setExpandedBS] = useState("bs-006");

  return (
    <div className="chart-card hierarchy-panel">
      <div className="chart-header">
        <h3>Asset Hierarchy</h3>
        <span className="chart-badge">BU → Service → App</span>
      </div>
      <div className="hierarchy-tree">
        {businessUnits.map((bu) => {
          const buServices = businessServices.filter((bs) => bs.buId === bu.id);
          const isExpandedBU = expandedBU === bu.id;
          return (
            <div key={bu.id} className="tree-level-1">
              <div
                className={`tree-node ${isExpandedBU ? "active" : ""}`}
                onClick={() => setExpandedBU(isExpandedBU ? null : bu.id)}
              >
                <span className="tree-chevron">{isExpandedBU ? "▾" : "▸"}</span>
                <span className="tree-icon">◼</span>
                <span className="tree-label">{bu.name}</span>
                <span className="tree-badge" style={{ background: riskBadgeColor(bu.riskScore) }}>
                  {bu.riskScore}
                </span>
              </div>
              {isExpandedBU && buServices.map((bs) => {
                const bsApps = applications.filter((a) => a.bsId === bs.id);
                const isExpandedBS = expandedBS === bs.id;
                return (
                  <div key={bs.id} className="tree-level-2">
                    <div
                      className={`tree-node ${isExpandedBS ? "active" : ""}`}
                      onClick={() => setExpandedBS(isExpandedBS ? null : bs.id)}
                    >
                      <span className="tree-chevron">{bsApps.length > 0 ? (isExpandedBS ? "▾" : "▸") : " "}</span>
                      <span className="tree-icon service-icon">◆</span>
                      <span className="tree-label">{bs.name}</span>
                      <span className="tree-badge" style={{ background: riskBadgeColor(bs.riskScore) }}>
                        {bs.riskScore}
                      </span>
                    </div>
                    {isExpandedBS && bsApps.map((app) => (
                      <div key={app.id} className="tree-level-3">
                        <div className="tree-node leaf">
                          <span className="tree-icon app-icon">●</span>
                          <span className="tree-label">{app.name}</span>
                          <span className="tree-meta">{app.findingCount} findings</span>
                          <span className="tree-badge" style={{ background: riskBadgeColor(app.riskScore) }}>
                            {app.riskScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

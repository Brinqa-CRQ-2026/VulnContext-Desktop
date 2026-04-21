function severityColor(s) {
  return { Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#3b82f6", Info: "#6b7280" }[s] || "#6b7280";
}

function statusColor(s) {
  return { Open: "#ef4444", "In Progress": "#f97316", Remediated: "#22d3ee" }[s] || "#94a3b8";
}

export default function FindingCard({ finding, showAsset = false }) {
  const sc = severityColor(finding.severity);
  const stc = statusColor(finding.status);

  return (
    <div className="finding-card">
      <div className="finding-card-top">
        <div className="finding-severity-stripe" style={{ background: sc }} />
        <div className="finding-main">
          <div className="finding-title-row">
            <span className="finding-cve" style={{ color: "#38bdf8" }}>{finding.cveId}</span>
            <span className="finding-title">{finding.title}</span>
          </div>
          <div className="finding-meta-row">
            <span className="severity-pill" style={{ "--pill-color": sc }}>{finding.severity}</span>
            <span className="cvss-label">CVSS <strong style={{ color: sc }}>{finding.cvss.toFixed(1)}</strong></span>
            <span className="finding-vector">Vector: {finding.vector}</span>
            <span
              className="status-chip"
              style={{
                color: stc,
                background: `color-mix(in srgb, ${stc} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${stc} 30%, transparent)`,
              }}
            >
              {finding.status}
            </span>
            {showAsset && finding._asset && (
              <span className="finding-asset-tag">{finding._asset.hostname}</span>
            )}
          </div>
        </div>
      </div>
      <div className="finding-card-bottom">
        <div className="finding-dates">
          <span>First seen: <strong>{finding.firstSeen}</strong></span>
          <span>Last seen: <strong>{finding.lastSeen}</strong></span>
        </div>
        <div className="finding-remediation">
          <span className="remediation-label">Remediation:</span>
          <span>{finding.remediation}</span>
        </div>
      </div>
    </div>
  );
}

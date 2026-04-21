const SEV_COLOR = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#3b82f6",
};

const STATUS_COLOR = {
  "Open":        "#ef4444",
  "In Progress": "#f97316",
  "Remediated":  "#22d3ee",
};

export default function Top5Findings({ findings, title = "Top 5 Findings" }) {
  const top5 = [...findings]
    .sort((a, b) => b.cvss - a.cvss || (a.severity < b.severity ? -1 : 1))
    .slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <div className="top5-panel">
      <div className="top5-header">
        <span className="top5-title">{title}</span>
        <span className="top5-sub">Ranked by CVSS score</span>
      </div>
      <div className="top5-list">
        {top5.map((f, i) => {
          const sc  = SEV_COLOR[f.severity]  || "#6b7280";
          const stc = STATUS_COLOR[f.status] || "#94a3b8";
          return (
            <div key={f.id ?? f.cveId ?? i} className="top5-row">
              <div className="top5-rank" style={{ color: sc }}>#{i + 1}</div>
              <div className="top5-stripe" style={{ background: sc }} />
              <div className="top5-main">
                <div className="top5-cve-row">
                  <span className="top5-cve">{f.cveId}</span>
                  <span className="top5-name">{f.title}</span>
                </div>
                <div className="top5-meta">
                  <span className="top5-sev-pill" style={{ "--sc": sc }}>{f.severity}</span>
                  <span className="top5-cvss" style={{ color: sc }}>CVSS {f.cvss.toFixed(1)}</span>
                  {f._asset && (
                    <span className="top5-asset">{f._asset.hostname}</span>
                  )}
                </div>
              </div>
              <div
                className="top5-status"
                style={{ color: stc, background: `color-mix(in srgb, ${stc} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${stc} 25%, transparent)` }}
              >
                {f.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { topCVEs } from "../data/mockData";

function severityLabel(cvss) {
  if (cvss >= 9.0) return { label: "Critical", color: "#ef4444" };
  if (cvss >= 7.0) return { label: "High", color: "#f97316" };
  if (cvss >= 4.0) return { label: "Medium", color: "#eab308" };
  return { label: "Low", color: "#3b82f6" };
}

export default function TopCVEsChart() {
  return (
    <div className="chart-card chart-wide">
      <div className="chart-header">
        <h3>Top CVEs by CVSS Score</h3>
        <span className="chart-badge">Sorted by severity</span>
      </div>
      <div className="cve-table">
        <div className="cve-table-head">
          <span>CVE ID</span>
          <span>Title</span>
          <span>CVSS</span>
          <span>Affected Assets</span>
          <span>Severity</span>
        </div>
        {topCVEs.map((cve) => {
          const { label, color } = severityLabel(cve.cvss);
          const barWidth = (cve.cvss / 10) * 100;
          return (
            <div className="cve-row" key={cve.cveId}>
              <span className="cve-id">{cve.cveId}</span>
              <span className="cve-title">{cve.title}</span>
              <span className="cve-cvss">
                <div className="cvss-bar-wrap">
                  <div className="cvss-bar" style={{ width: `${barWidth}%`, background: color }} />
                </div>
                <span style={{ color }}>{cve.cvss.toFixed(1)}</span>
              </span>
              <span className="cve-assets">{cve.affectedAssets}</span>
              <span className="severity-pill" style={{ "--pill-color": color }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

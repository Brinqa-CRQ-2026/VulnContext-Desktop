import { useState, useEffect } from "react";
import { fetchServiceDetail } from "../api";
import Breadcrumb from "../components/Breadcrumb";

export default function ServiceView({ service, company, onSelectApp, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchServiceDetail(service.buSlug, service.slug);
        if (mounted) { setDetail(data); setError(null); }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [service.buSlug, service.slug]);

  const crumbs = [
    { label: "Organizations", target: { view: "companies" } },
    { label: company.name, target: { view: "company", company } },
    { label: service.buName || "Business Unit" },
    { label: service.name },
  ];

  const metrics = detail?.metrics ?? service.metrics ?? {};

  return (
    <div className="view service-view">
      <Breadcrumb crumbs={crumbs} onNavigate={onNavigate} />

      <div className="view-intro">
        <h1 className="view-title">{service.name}</h1>
        {detail && (
          <p className="view-desc">
            {detail.business_unit} · {metrics.total_applications ?? 0} applications ·{" "}
            {metrics.total_assets ?? 0} assets ·{" "}
            <span style={{ color: "#ef4444" }}>{metrics.total_findings ?? 0} findings</span>
          </p>
        )}
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading service…
        </div>
      )}

      {error && (
        <div style={{
          padding: "20px",
          margin: "20px",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "8px",
          color: "#ef4444",
        }}>
          Error: {error}
        </div>
      )}

      {detail && (
        <>
          <div className="section-label" style={{ marginTop: 28 }}>
            Applications ({detail.applications.length})
          </div>
          <div className="app-cards-grid">
            {detail.applications.length === 0 && (
              <div style={{ color: "#64748b", fontSize: 13 }}>No applications found.</div>
            )}
            {detail.applications.map((app) => (
              <button
                key={app.slug}
                className="app-card"
                onClick={() => onSelectApp({
                  name: app.application,
                  slug: app.slug,
                  buSlug: service.buSlug,
                  serviceSlug: service.slug,
                  metrics: app.metrics,
                })}
                style={{ "--app-accent": "#22d3ee" }}
              >
                <div className="app-card-top">
                  <div
                    className="app-score-ring"
                    style={{
                      color: "#22d3ee",
                      borderColor: "rgba(34,211,238,0.5)",
                      background: "rgba(34,211,238,0.1)",
                    }}
                  >
                    {app.metrics.total_findings}
                  </div>
                  <div className="app-card-info">
                    <div className="app-card-name">{app.application}</div>
                    <div className="app-card-meta">{app.metrics.total_assets} assets</div>
                  </div>
                </div>
                <div className="app-finding-bar">
                  <span className="app-finding-label">Findings</span>
                  <span className="app-finding-count" style={{ color: "#22d3ee" }}>
                    {app.metrics.total_findings}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

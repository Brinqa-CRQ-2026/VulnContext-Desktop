import { useState, useEffect } from "react";
import { fetchCompanyDetail } from "../api";
import Breadcrumb from "../components/Breadcrumb";

export default function CompanyView({ company, onSelectService, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCompanyDetail(company.id);
        if (mounted) { setDetail(data); setError(null); }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [company.id]);

  const crumbs = [
    { label: "Organizations", target: { view: "companies" } },
    { label: company.name },
  ];

  return (
    <div className="view company-view">
      <Breadcrumb crumbs={crumbs} onNavigate={onNavigate} />

      <div className="view-intro">
        <h1 className="view-title">{company.name}</h1>
        {detail && (
          <p className="view-desc">
            {detail.business_units.length} Business Units ·{" "}
            {detail.metrics.total_assets.toLocaleString()} assets ·{" "}
            <span style={{ color: "#ef4444" }}>
              {detail.metrics.total_findings.toLocaleString()} findings
            </span>
          </p>
        )}
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading business units…
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

      {detail && detail.business_units.length === 0 && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          No business units found for this company.
        </div>
      )}

      {detail && detail.business_units.length > 0 && (
        <div className="bu-list" style={{ marginTop: 28 }}>
          {detail.business_units.map((bu) => (
            <div key={bu.slug} className="bu-section">
              <div className="bu-header">
                <div className="bu-header-left">
                  <span className="bu-icon" style={{ color: "#22d3ee" }}>◼</span>
                  <span className="bu-name">{bu.business_unit}</span>
                  <span className="bu-stat">{bu.metrics.total_assets} assets</span>
                  <span className="bu-stat">{bu.metrics.total_findings} findings</span>
                </div>
              </div>

              <div className="service-grid">
                {bu.business_services.length === 0 && (
                  <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>
                    No services
                  </div>
                )}
                {bu.business_services.map((bs) => (
                  <button
                    key={bs.slug}
                    className="service-card"
                    onClick={() => onSelectService({
                      name: bs.business_service,
                      slug: bs.slug,
                      buSlug: bu.slug,
                      buName: bu.business_unit,
                      metrics: bs.metrics,
                    })}
                    style={{ "--svc-accent": "#22d3ee" }}
                  >
                    <div className="service-card-top">
                      <span className="service-env">{bs.metrics.total_applications} apps</span>
                    </div>
                    <div className="service-name">{bs.business_service}</div>
                    <div className="service-meta">
                      <span>{bs.metrics.total_applications} apps</span>
                      <span>{bs.metrics.total_assets} assets</span>
                      <span style={{ color: bs.metrics.total_findings > 100 ? "#ef4444" : "#94a3b8" }}>
                        {bs.metrics.total_findings} findings
                      </span>
                    </div>
                    <div className="service-bar-track">
                      <div
                        className="service-bar-fill"
                        style={{
                          width: bs.metrics.total_findings > 0 ? "60%" : "10%",
                          background: "#22d3ee",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

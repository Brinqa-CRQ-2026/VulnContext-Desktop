import { useState, useEffect } from "react";
import { fetchCompanies } from "../api";

export default function CompaniesView({ onSelect }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadCompanies() {
      try {
        setLoading(true);
        const data = await fetchCompanies();
        if (mounted) {
          // Transform API data to match the format expected by other views
          const transformedData = data.map(company => ({
            id: company.id,
            name: company.name,
            industry: "Organization", // Default since API doesn't provide this
            riskScore: 0, // Default since we don't have risk scoring yet
            buCount: company.metrics.total_business_services,
            serviceCount: company.metrics.total_business_services,
            assetCount: company.metrics.total_assets,
            findingCount: company.metrics.total_findings,
            criticalCount: 0, // We'd need to query findings by severity
            metrics: company.metrics, // Keep original for our display
          }));
          setCompanies(transformedData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setCompanies([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    loadCompanies();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="view companies-view">
      <div className="view-intro">
        <h1 className="view-title">Organizations</h1>
        <p className="view-desc">Select a company to explore its security posture.</p>
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading companies...
        </div>
      )}

      {error && (
        <div style={{
          padding: "40px",
          textAlign: "center",
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          borderRadius: "12px",
          color: "white",
          margin: "20px"
        }}>
          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            Data Not Available
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            {error}
          </div>
          <div style={{ fontSize: "13px", marginTop: "12px", opacity: 0.8 }}>
            This is a test screen - the backend may not be running or the database may not be initialized.
          </div>
        </div>
      )}

      {!loading && !error && companies.length === 0 && (
        <div style={{
          padding: "40px",
          textAlign: "center",
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          borderRadius: "12px",
          color: "white",
          margin: "20px"
        }}>
          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            No Companies Found
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            There are no companies in the database yet.
          </div>
        </div>
      )}

      {!loading && !error && companies.length > 0 && (
        <div className="company-grid">
          {companies.map((co) => {
            const initials = co.name.split(" ").map(w => w[0]).join("").slice(0, 2);
            const hasData = co.assetCount > 0;
            const accentColor = hasData ? "#22d3ee" : "#10b981";

            return (
              <button
                key={co.id}
                className="company-card"
                onClick={() => onSelect(co)}
                style={{ "--accent": accentColor }}
              >
                {/* Top section — padded */}
                <div className="card-body">
                  <div className="company-card-top">
                    <div className="company-initials">
                      {initials}
                    </div>
                    {!hasData && (
                      <div
                        className="risk-pill"
                        style={{
                          color: "#10b981",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        No Data
                      </div>
                    )}
                  </div>

                  <div className="company-name">{co.name}</div>
                  <div className="company-industry">
                    {hasData ? "Active" : "Awaiting Data"}
                  </div>
                </div>

                {/* Stats section */}
                <div className="card-body card-body-bottom" style={{ marginTop: "auto" }}>
                  <div className="company-stats">
                    <span>
                      <strong>{co.buCount}</strong> Business Units
                    </span>
                    <span>
                      <strong>{co.assetCount.toLocaleString()}</strong> Assets
                    </span>
                    <span>
                      <strong style={{ color: "#ef4444" }}>{co.findingCount.toLocaleString()}</strong> Findings
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KPICard({ label, value, sub, accent, icon }) {
  return (
    <div className="kpi-card" style={{ "--kpi-accent": accent }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

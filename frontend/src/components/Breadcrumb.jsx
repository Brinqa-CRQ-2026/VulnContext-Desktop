export default function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <nav className="breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="crumb-item">
            {i > 0 && <span className="crumb-sep">›</span>}
            {isLast ? (
              <span className="crumb-current">{crumb.label}</span>
            ) : (
              <button className="crumb-link" onClick={() => onNavigate(crumb.target)}>
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

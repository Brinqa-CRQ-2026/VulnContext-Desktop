const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3L5 8l5 5" />
  </svg>
);

const ForwardArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3l5 5-5 5" />
  </svg>
);

export default function Header({ title, sub, canGoBack, canGoForward, onBack, onForward }) {
  return (
    <header className="app-header">
      {/* Left — logo */}
      <div className="header-left">
        <div className="logo-mark">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <polygon points="14,7 21,11 21,18 14,22 7,18 7,11" fill="#38bdf8" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="14" cy="14" r="3" fill="#38bdf8" />
          </svg>
        </div>
        <div className="logo-text">
          <span className="app-name">Brinqa Risk Console</span>
        </div>
      </div>

      {/* Centre — nav arrows + current screen label */}
      <div className="header-center">
        <button
          className={`nav-arrow ${canGoBack ? "" : "disabled"}`}
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back"
        >
          <BackArrow />
        </button>
        <button
          className={`nav-arrow ${canGoForward ? "" : "disabled"}`}
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Go forward"
        >
          <ForwardArrow />
        </button>
        <div className="screen-label">
          <span className="screen-sub">{sub}</span>
          <span className="screen-title">{title}</span>
        </div>
      </div>

      {/* Right — status */}
      <div className="header-right">
        <div className="data-freshness">
          <span className="pulse-dot" />
          <span>Live — Last sync 4m ago</span>
        </div>
        <div className="header-tag">MOCKUP</div>
      </div>
    </header>
  );
}

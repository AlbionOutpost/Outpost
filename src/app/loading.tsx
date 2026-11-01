export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="loading-layout">
      <div aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton" />
        <div className="calculator-grid section">
          <div className="panel">
            <div className="skeleton" />
            <div className="input-grid">
              {[0, 1, 2, 3].map((i) => (
                <div className="skeleton skeleton-field" key={i} />
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="skeleton skeleton-title" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

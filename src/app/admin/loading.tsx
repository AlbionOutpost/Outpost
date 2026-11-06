export default function AdminLoading() {
  return (
    <div className="admin-workspace" role="status" aria-live="polite">
      <span className="sr-only">Loading administration…</span>
      <div className="well admin-loading" aria-hidden="true" />
      <div className="admin-main">
        <div className="well admin-loading" aria-hidden="true" />
        <div className="well admin-loading" aria-hidden="true" />
      </div>
    </div>
  );
}

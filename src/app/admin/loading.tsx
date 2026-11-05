export default function AdminLoading() {
  return (
    <section className="admin-surface" role="status" aria-live="polite">
      <h1>Loading administration…</h1>
      <p>Checking access and fetching current records.</p>
    </section>
  );
}

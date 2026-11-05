"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="admin-surface" role="alert">
      <h1>Administration is unavailable</h1>
      <p>
        The current records could not be loaded. No change has been confirmed. Refresh the data
        before trying an action again.
      </p>
      <button className="button secondary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}

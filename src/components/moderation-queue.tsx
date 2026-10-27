"use client";
import { useState } from "react";
type Report = {
  id: string;
  version: number;
  status: string;
  reason: string;
  reviewNote: string;
  build: { id: string; title: string; hiddenAt: string | null } | null;
  composition: { id: string; title: string; hiddenAt: string | null } | null;
  comment: { id: string; body: string; hiddenAt: string | null } | null;
};
export function ModerationQueue() {
  const [rows, setRows] = useState<Report[]>([]),
    [status, setStatus] = useState("OPEN"),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false),
    [note, setNote] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(p = 1) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/reports?status=${status}&page=${p}`),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setRows(b.reports);
      setPage(p);
      setHasNext(b.hasNext);
      setMessage("Queue loaded.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Queue unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <label>
        Report status
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setRows([]);
          }}
        >
          {["OPEN", "RESOLVED", "DISMISSED", "ALL"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <button className="button secondary" disabled={busy} onClick={() => load()}>
        Load moderation queue
      </button>
      <label>
        Review rationale (required)
        <textarea
          minLength={10}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {rows.map((r) => (
        <article className="panel section" key={r.id}>
          <h2>{r.build?.title || r.composition?.title || "Reported comment"}</h2>
          {r.comment && <p className="preserve">{r.comment.body}</p>}
          <p className="preserve">{r.reason}</p>
          <p>
            {r.status} · revision {r.version} ·{" "}
            {r.build?.hiddenAt || r.composition?.hiddenAt || r.comment?.hiddenAt
              ? "Hidden"
              : "Visible"}
          </p>
          {r.reviewNote && <p className="preserve">Previous review: {r.reviewNote}</p>}
          <div className="actions">
            {(["hide", "restore", "resolve", "dismiss"] as const).map((action) => (
              <button
                key={action}
                className="button secondary"
                disabled={busy || note.trim().length < 10}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const response = await fetch("/api/admin/reports", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reportId: r.id, version: r.version, action, note }),
                      }),
                      b = await response.json();
                    if (!response.ok) throw new Error(b.error);
                    await load(page);
                    setMessage("Moderation action saved and audited.");
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Review failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {action === "hide"
                  ? "Hide reported content"
                  : action === "restore"
                    ? "Restore reported content"
                    : action === "resolve"
                      ? "Resolve report"
                      : "Dismiss report"}
              </button>
            ))}
          </div>
        </article>
      ))}
      <div className="actions">
        <button
          className="button secondary"
          disabled={busy || page === 1}
          onClick={() => load(page - 1)}
        >
          Previous reports
        </button>
        <span>Page {page}</span>
        <button
          className="button secondary"
          disabled={busy || !hasNext}
          onClick={() => load(page + 1)}
        >
          Next reports
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}

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
    [busy, setBusy] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false);
  async function load(p = 1) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/reports?status=${status}&page=${p}`),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setRows(b.reports);
      const nextId = b.reports.some((report: Report) => report.id === selectedId)
        ? selectedId
        : b.reports[0]?.id || null;
      setSelectedId(nextId);
      if (nextId !== selectedId) setNote("");
      setLoaded(true);
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
    <section className="support-moderation">
      <div className="support-toolbar">
        <label>
          Report status
          <select
            disabled={busy}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setRows([]);
              setSelectedId(null);
              setLoaded(false);
              setPage(1);
              setHasNext(false);
              setNote("");
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
      </div>
      {!loaded && (
        <div className="support-empty">
          <h2>Choose a queue to review</h2>
          <p>Load the selected report status. Moderation actions require a written rationale.</p>
        </div>
      )}
      {loaded && !rows.length && (
        <div className="support-empty">
          <h2>No reports in this queue</h2>
          <p>Choose another status or reload to check for new reports.</p>
        </div>
      )}
      <div className="moderation-review-layout">
        <nav className="moderation-report-list" aria-label="Loaded reports">
          {rows.map((report) => (
            <button
              type="button"
              disabled={busy}
              key={report.id}
              aria-current={selectedId === report.id ? "true" : undefined}
              onClick={() => {
                setSelectedId(report.id);
                setNote("");
              }}
            >
              <strong>
                {report.build?.title || report.composition?.title || "Reported comment"}
              </strong>
              <span>
                {report.status} · revision {report.version}
              </span>
            </button>
          ))}
        </nav>
        <div>
          {rows
            .filter((report) => report.id === selectedId)
            .map((r) => (
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
                <label>
                  Review rationale (required)
                  <textarea
                    minLength={10}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
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
                              body: JSON.stringify({
                                reportId: r.id,
                                version: r.version,
                                action,
                                note,
                              }),
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
        </div>
      </div>
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

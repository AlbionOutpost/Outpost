"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminChip } from "./admin-chip";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
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
const statuses = [
  ["OPEN", "Open"],
  ["RESOLVED", "Resolved"],
  ["DISMISSED", "Dismissed"],
  ["ALL", "All"],
] as const;
const actions = [
  ["hide", "Hide reported content"],
  ["restore", "Restore reported content"],
  ["resolve", "Resolve report"],
  ["dismiss", "Dismiss report"],
] as const;
const titleOf = (r: Report) => r.build?.title || r.composition?.title || "Reported comment";
const kindOf = (r: Report) => (r.build ? "Build" : r.composition ? "Comp" : "Comment");
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const hiddenOf = (r: Report) =>
  !!(r.build?.hiddenAt || r.composition?.hiddenAt || r.comment?.hiddenAt);

export function AdminReports() {
  const [rows, setRows] = useState<Report[]>([]),
    [status, setStatus] = useState("OPEN"),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false),
    [note, setNote] = useState(""),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false);
  const load = useCallback(async (p: number, s: string, keep: string | null) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/reports?status=${s}&page=${p}`),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setRows(b.reports);
      const next = b.reports.some((x: Report) => x.id === keep) ? keep : b.reports[0]?.id || null;
      setSelectedId((cur) => {
        if (cur !== next) setNote("");
        return next;
      });
      setLoaded(true);
      setPage(p);
      setHasNext(b.hasNext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The queue could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    // Load the queue whenever the status changes; the first load runs on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fetch result is the state
    void load(1, status, null);
  }, [load, status]);
  const selected = rows.find((r) => r.id === selectedId);
  async function act(r: Report, action: string) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: r.id, version: r.version, action, note }),
        }),
        b = await response.json();
      if (!response.ok) throw new Error(b.error);
      await load(page, status, selectedId);
      setSaved("Moderation action saved and audited.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The review could not be saved.");
      setBusy(false);
    }
  }
  return (
    <section className="panel admin-reports" aria-labelledby="admin-queue">
      <PanelHead
        id="admin-queue"
        title={
          <>
            Report <em>queue</em>
          </>
        }
        line="Every action needs a written reason and is recorded."
        actions={
          <button
            type="button"
            className="pill-link"
            disabled={busy}
            onClick={() => load(page, status, selectedId)}
          >
            <RefreshCw size={15} aria-hidden="true" /> Refresh queue
          </button>
        }
      />
      <div className="admin-seg" role="group" aria-label="Report status">
        {statuses.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            disabled={busy && status !== key}
            onClick={() => {
              if (key === status) return;
              setStatus(key);
              setRows([]);
              setSelectedId(null);
              setLoaded(false);
              setPage(1);
              setHasNext(false);
              setNote("");
              setSaved("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="admin-error well" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="pill-link"
            onClick={() => load(page, status, selectedId)}
          >
            Retry
          </button>
        </div>
      ) : busy ? (
        <StatusLine>Loading reports…</StatusLine>
      ) : saved ? (
        <StatusLine>{saved}</StatusLine>
      ) : null}
      {loaded && !rows.length && !error && (
        <EmptyWell
          emblem="strip-content"
          title={status === "OPEN" ? "No open reports" : "No reports in this view"}
          line={
            status === "OPEN"
              ? "Nothing is waiting for review. New reports appear here when players send them."
              : "Pick another status to see more."
          }
        />
      )}
      {rows.length > 0 && (
        <div className="admin-review-layout">
          <nav className="admin-report-list" aria-label="Loaded reports">
            {rows.map((report) => (
              <button
                type="button"
                disabled={busy}
                key={report.id}
                className="well"
                aria-current={selectedId === report.id ? "true" : undefined}
                onClick={() => {
                  setSelectedId(report.id);
                  setNote("");
                }}
              >
                <strong>{titleOf(report)}</strong>
                <span>
                  {kindOf(report)} · {statusLabel(report.status)}
                  {hiddenOf(report) ? " · Hidden" : ""}
                </span>
              </button>
            ))}
          </nav>
          {selected && (
            <article className="admin-report well" key={selected.id}>
              <h3>{titleOf(selected)}</h3>
              <div className="admin-chips">
                <AdminChip>{kindOf(selected)}</AdminChip>
                <AdminChip tone={selected.status === "OPEN" ? "warn" : "default"}>
                  {statusLabel(selected.status)}
                </AdminChip>
                <AdminChip tone={hiddenOf(selected) ? "danger" : "default"}>
                  {hiddenOf(selected) ? "Hidden" : "Visible"}
                </AdminChip>
              </div>
              {selected.comment && (
                <blockquote className="preserve">{selected.comment.body}</blockquote>
              )}
              <p className="admin-reason preserve">
                <span>Reason given</span>
                {selected.reason}
              </p>
              {selected.reviewNote && (
                <p className="admin-reason preserve">
                  <span>Previous review</span>
                  {selected.reviewNote}
                </p>
              )}
              <label className="admin-field">
                Review rationale (required)
                <textarea
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="admin-action-buttons">
                {actions.map(([action, text]) => (
                  <button
                    key={action}
                    type="button"
                    className={`button secondary${action === "hide" ? " admin-danger" : ""}`}
                    disabled={busy || note.trim().length < 10}
                    onClick={() => act(selected, action)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </article>
          )}
        </div>
      )}
      {(page > 1 || hasNext) && (
        <nav className="admin-pagination" aria-label="Report pages">
          <button
            type="button"
            className="pill-link"
            disabled={busy || page === 1}
            onClick={() => load(page - 1, status, selectedId)}
          >
            Previous reports
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            className="pill-link"
            disabled={busy || !hasNext}
            onClick={() => load(page + 1, status, selectedId)}
          >
            Next reports
          </button>
        </nav>
      )}
    </section>
  );
}

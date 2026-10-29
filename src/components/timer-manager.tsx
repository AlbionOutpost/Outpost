"use client";
import { useEffect, useState } from "react";
import { remainingTime } from "@/lib/timers/engine";
type Timer = {
  id: string;
  title: string;
  category: string;
  status: string;
  dueAt: string | null;
  remainingMs: number | null;
  durationMs: number;
  version: number;
};
export function TimerManager({ initial }: { initial: Timer[] }) {
  const [timers, setTimers] = useState(initial),
    [now, setNow] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("active"),
    [composerOpen, setComposerOpen] = useState(initial.length === 0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  async function refresh() {
    const r = await fetch("/api/timers"),
      b = await r.json();
    if (!r.ok) throw new Error(b.error);
    setTimers(b);
  }
  async function update(t: Timer, action: string, title?: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/timers/${t.id}`, {
          method: action === "delete" ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          ...(action !== "delete"
            ? { body: JSON.stringify({ action, version: t.version, title }) }
            : {}),
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      await refresh();
      setMessage("Timer change saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Timer update failed.");
    } finally {
      setBusy(false);
    }
  }
  const visible = timers
    .filter(
      (timer) =>
        filter === "all" ||
        (filter === "active" ? timer.status !== "COMPLETED" : timer.status === "COMPLETED"),
    )
    .toSorted((a, b) => {
      const rank = (status: string) => (status === "RUNNING" ? 0 : status === "PAUSED" ? 1 : 2);
      return (
        rank(a.status) - rank(b.status) ||
        (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity) ||
        a.title.localeCompare(b.title)
      );
    });
  return (
    <div className="support-timers">
      <div className="support-toolbar timer-toolbar">
        <label>
          Show timers
          <select
            aria-label="Timer status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="active">Active & paused</option>
            <option value="completed">Completed</option>
            <option value="all">All timers</option>
          </select>
        </label>
        <span>
          {visible.length} shown · {timers.filter((t) => t.status === "RUNNING").length} running
        </span>
        <button
          type="button"
          className="button primary"
          onClick={() => {
            setComposerOpen(true);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>('#timer-composer input[name="title"]')
                ?.focus(),
            );
          }}
        >
          Add timer
        </button>
      </div>
      <button
        className="button secondary timer-reload"
        disabled={busy}
        onClick={() => refresh().catch(() => setMessage("Could not reload timers."))}
      >
        Reload timers
      </button>
      <p className="timer-feedback" role="status">
        {message}
      </p>
      <div className="timer-active-list" role="region" aria-label="Your timers">
        {visible.map((t) => {
          const left = Math.ceil(
              remainingTime({ ...t, dueAt: t.dueAt ? new Date(t.dueAt) : null }, now ?? 0) / 1000,
            ),
            text = `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m ${left % 60}s`;
          return (
            <article
              id={`timer-${t.id}`}
              className={`timer-row status-${t.status.toLowerCase()}`}
              key={t.id}
            >
              <div className="timer-row-state">
                {t.category} · {t.status}
              </div>
              <h2 tabIndex={-1}>{t.title}</h2>
              <p className="timer-countdown numeric" aria-live="off">
                {now === null ? "Updating countdown…" : left === 0 ? "Due / completed" : text}
              </p>
              {t.dueAt && (
                <p className="muted">
                  Due: <time dateTime={t.dueAt}>{t.dueAt.slice(0, 16).replace("T", " ")} UTC</time>
                </p>
              )}
              <div className="actions">
                {t.status === "RUNNING" && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => update(t, "pause")}
                  >
                    Pause timer
                  </button>
                )}
                {t.status === "PAUSED" && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => update(t, "resume")}
                  >
                    Resume timer
                  </button>
                )}
                <details className="timer-more-actions">
                  <summary>More timer actions</summary>
                  <div>
                    {" "}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => update(t, "reset")}
                    >
                      Reset timer
                    </button>
                    {t.status !== "COMPLETED" && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => update(t, "complete")}
                      >
                        Complete timer
                      </button>
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        const title = window.prompt("New timer title", t.title);
                        if (title) update(t, "rename", title);
                      }}
                    >
                      Rename timer
                    </button>
                    <button
                      className="button secondary negative"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Delete this timer?")) update(t, "delete");
                      }}
                    >
                      Delete timer
                    </button>
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <section className="support-empty">
          <h2>{timers.length ? "No timers in this view" : "Your next reminder starts here"}</h2>
          <p>
            {timers.length
              ? "Choose another timer status, or add a new reminder."
              : "Add your own duration for a run, a cooldown or a return to your island."}
          </p>
        </section>
      )}
      <details
        id="timer-composer"
        className="timer-composer"
        open={composerOpen}
        onToggle={(event) => setComposerOpen(event.currentTarget.open)}
      >
        <summary>Create a manual timer</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form);
            setBusy(true);
            try {
              const r = await fetch("/api/timers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: f.get("title"),
                    category: f.get("category"),
                    durationMinutes: Number(f.get("duration")),
                  }),
                }),
                b = await r.json();
              if (!r.ok) throw new Error(b.error);
              await refresh();
              form.reset();
              setComposerOpen(false);
              setFilter("active");
              requestAnimationFrame(() =>
                document.getElementById(`timer-${b.id}`)?.querySelector<HTMLElement>("h2")?.focus(),
              );
              setMessage("Timer saved. Refreshing the page will not reset it.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Could not create timer.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="input-grid">
            <label>
              Timer title
              <input name="title" maxLength={100} required />
            </label>
            <label>
              Timer category
              <select name="category">
                {["CUSTOM", "CROP", "ANIMAL", "LABORER", "FOCUS", "REMINDER"].map((c) => (
                  <option key={c} value={c}>
                    {
                      (
                        {
                          CUSTOM: "Custom",
                          CROP: "Crops",
                          ANIMAL: "Animals",
                          LABORER: "Laborers",
                          FOCUS: "Focus",
                          REMINDER: "Reminder",
                        } as Record<string, string>
                      )[c]
                    }
                  </option>
                ))}
              </select>
            </label>
            <label>
              Manual duration (minutes)
              <input name="duration" type="number" min={1} max={30000} required />
            </label>
          </div>
          <button className="button primary" disabled={busy}>
            Create timer
          </button>
        </form>
        <p className="muted">
          Set the duration yourself; categories do not calculate crop, laborer or focus recovery
          times. Your timers are saved between visits. Countdowns run on this page while it is open;
          background notifications and shared timers are not available.
        </p>
      </details>
    </div>
  );
}

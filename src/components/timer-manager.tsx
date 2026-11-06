"use client";
import { useEffect, useState } from "react";
import { MoreHorizontal, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { remainingTime } from "@/lib/timers/engine";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { WorkspaceHeading } from "./workspace-heading";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { Field } from "./group-parts";
import { countdown, timerCategories, timerCategory, timerStatus } from "./timer-labels";
import styles from "./account.module.css";

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
const filters = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["all", "All"],
] as const;
const utc = (iso: string) =>
  `${new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;

/**
 * The player's own countdowns: running first, then paused, each a card with a Barlow countdown
 * in a well. Every change goes to `/api/timers`, which checks the owner and the row version.
 */
export function TimerManager({
  initial,
  initialCursor = null,
}: {
  initial: Timer[];
  initialCursor?: string | null;
}) {
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
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
    setNextCursor(null);
    const r = await fetch("/api/timers"),
      b = await r.json();
    if (!r.ok) throw new Error(b.error);
    setTimers(b);
    setNextCursor(r.headers.get("X-Next-Cursor"));
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
  function openComposer() {
    setComposerOpen(true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('#timer-composer input[name="title"]')?.focus(),
    );
  }
  const counts = {
    active: timers.filter((t) => t.status !== "COMPLETED").length,
    completed: timers.filter((t) => t.status === "COMPLETED").length,
    all: timers.length,
  };
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
  const running = timers.filter((t) => t.status === "RUNNING").length;
  return (
    <>
      <WorkspaceHeading
        scene="economy"
        title="Personal timers"
        accent="timers"
        description="Crops, laborers, a castle chest: set the countdown and check it from any device."
        icon="timer"
        actions={
          <button type="button" className="button primary" onClick={openComposer}>
            <Plus size={17} aria-hidden="true" /> Add timer
          </button>
        }
      >
        <div className={`landing-chips ${styles.chips}`}>
          <span className="landing-chip is-muted">{running} running</span>
          <span className="landing-chip is-muted">Saved to your account</span>
        </div>
      </WorkspaceHeading>
      {composerOpen && (
        <section
          id="timer-composer"
          className={`panel ${styles.panel} ${styles.composer}`}
          aria-labelledby="timer-composer-title"
        >
          <PanelHead
            id="timer-composer-title"
            emblem="team-calendar"
            title={timers.length ? "Add a timer" : "Start your first timer"}
            line="Set the minutes yourself. Countdowns tick while a page is open; Outpost sends no notifications."
          />
          <form
            className={styles.timerForm}
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
                  document
                    .getElementById(`timer-${b.id}`)
                    ?.querySelector<HTMLElement>("h2")
                    ?.focus(),
                );
                setMessage("Timer saved. Refreshing the page will not reset it.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Could not create timer.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Timer title">
              <input name="title" maxLength={100} required placeholder="Island crops" />
            </Field>
            <Field label="Timer category">
              <WellSelect name="category">
                {timerCategories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </WellSelect>
            </Field>
            <Field label="Manual duration (minutes)">
              <input name="duration" type="number" min={1} max={30000} required />
            </Field>
            <div className={styles.timerFormActions}>
              {timers.length > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setComposerOpen(false)}
                >
                  Not now
                </button>
              )}
              <button className="button primary" disabled={busy}>
                Create timer
              </button>
            </div>
          </form>
        </section>
      )}
      <p role="status" className={message ? styles.saved : "sr-only"}>
        {message}
      </p>
      {timers.length > 0 && (
        <section className={styles.timerSection} aria-labelledby="timer-list-title">
          <div className={styles.timerBar}>
            <h2 id="timer-list-title" className="sr-only">
              Your timers
            </h2>
            <div className={styles.segments} role="group" aria-label="Timer status">
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label} <span>{counts[value]}</span>
                </button>
              ))}
            </div>
            <button
              className="pill-link is-small"
              type="button"
              disabled={busy}
              onClick={() => refresh().catch(() => setMessage("Could not reload timers."))}
            >
              <RotateCcw size={14} aria-hidden="true" /> Reload timers
            </button>
          </div>
          {visible.length ? (
            <ul className={styles.timerGrid} aria-label="Your timers">
              {visible.map((t) => (
                <li key={t.id}>
                  <TimerCard timer={t} now={now} busy={busy} update={update} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWell
              emblem="team-calendar"
              title={filter === "completed" ? "No finished timers" : "No timers running"}
              line="Switch the filter above, or start a new countdown."
              action={
                <button type="button" className="button secondary" onClick={openComposer}>
                  Add timer
                </button>
              }
            />
          )}
          <AccountPageMore<Timer>
            url="/api/timers"
            cursor={nextCursor}
            disabled={busy}
            label="Load older timers"
            onPage={(rows, cursor) => {
              setTimers((current) => appendAccountRows(current, rows));
              setNextCursor(cursor);
            }}
          />
        </section>
      )}
    </>
  );
}

function TimerCard({
  timer: t,
  now,
  busy,
  update,
}: {
  timer: Timer;
  now: number | null;
  busy: boolean;
  update: (t: Timer, action: string, title?: string) => void;
}) {
  const [more, setMore] = useState(false);
  const left = Math.ceil(
    remainingTime({ ...t, dueAt: t.dueAt ? new Date(t.dueAt) : null }, now ?? 0) / 1000,
  );
  const done = left === 0;
  return (
    <article
      id={`timer-${t.id}`}
      className={`panel ${styles.panel} ${styles.timer}`}
      data-status={t.status.toLowerCase()}
    >
      <div className={styles.timerHead}>
        <span className="landing-chip is-muted">{timerCategory(t.category)}</span>
        <span className={t.status === "RUNNING" ? "landing-chip" : "landing-chip is-muted"}>
          {timerStatus(t.status)}
        </span>
      </div>
      <h2 tabIndex={-1} className={styles.timerTitle}>
        {t.title}
      </h2>
      <div className={`well ${styles.countdown}`}>
        <p aria-live="off" data-done={now !== null && done ? "" : undefined}>
          {now === null ? "Updating countdown…" : done ? "Due" : countdown(left)}
        </p>
        <small>
          {t.status === "RUNNING" && t.dueAt ? (
            <>
              Due <time dateTime={t.dueAt}>{utc(t.dueAt)}</time>
            </>
          ) : t.status === "PAUSED" ? (
            "Paused; resume to keep counting"
          ) : (
            `Ran ${countdown(Math.round(t.durationMs / 1000))}`
          )}
        </small>
      </div>
      <div className={styles.timerActions}>
        {t.status === "RUNNING" && (
          <button className="button secondary" disabled={busy} onClick={() => update(t, "pause")}>
            <Pause size={16} aria-hidden="true" /> Pause timer
          </button>
        )}
        {t.status === "PAUSED" && (
          <button className="button primary" disabled={busy} onClick={() => update(t, "resume")}>
            <Play size={16} aria-hidden="true" /> Resume timer
          </button>
        )}
        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={more}
          aria-controls={`timer-more-${t.id}`}
          onClick={() => setMore((open) => !open)}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
          <span>More timer actions</span>
        </button>
      </div>
      <div id={`timer-more-${t.id}`} className={styles.moreActions} hidden={!more}>
        <button className="button secondary" disabled={busy} onClick={() => update(t, "reset")}>
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
          className={`button secondary ${styles.lossButton}`}
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this timer?")) update(t, "delete");
          }}
        >
          Delete timer
        </button>
      </div>
    </article>
  );
}

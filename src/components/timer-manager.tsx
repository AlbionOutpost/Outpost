"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "@/components/link";
import { remainingTime } from "@/lib/timers/engine";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { WorkspaceHeading } from "./workspace-heading";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { Field } from "./field";
import { countdown, timerCategories, timerCategory } from "./timer-labels";
import styles from "./timer-manager.module.css";
import { NumberField } from "./number-field";
import { GameTime } from "./game-time";

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
type Preset = {
  title: string;
  category: string;
  /** Only waits Outpost states in its own guides carry a time; the rest are set by the player. */
  minutes?: number;
  source?: { label: string; href: string };
};
const presets: Preset[] = [
  {
    title: "Crops",
    category: "CROP",
    minutes: 22 * 60,
    source: { label: "Islands and farming guide", href: "/guides/islands-and-farming-guide" },
  },
  { title: "Herbs", category: "CROP" },
  { title: "Animals", category: "ANIMAL" },
  { title: "Laborer journals", category: "LABORER" },
  { title: "Focus refill", category: "FOCUS" },
  {
    title: "Drake Egg Biscuits",
    category: "REMINDER",
    minutes: 25 * 60,
    source: { label: "Dragonfire items guide", href: "/guides/dragonfire-items" },
  },
];
const filters = [
  ["active", "Active"],
  ["completed", "Cleared"],
  ["all", "All"],
] as const;
/** Whole seconds as a clock: "21:59:42". */
const clock = (seconds: number) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
};
/** A whole duration without a zero tail: "22h", "12h 30m", "45m". */
const span = (seconds: number) => countdown(seconds).replace(/ 00m$/, "");
const secondsLeft = (t: Timer, now: number) =>
  Math.ceil(remainingTime({ ...t, dueAt: t.dueAt ? new Date(t.dueAt) : null }, now) / 1000);

/**
 * The player's own countdowns: a list of timers with a clock, a progress bar and their actions,
 * beside a composer with presets for common Albion waits. Every change goes to `/api/timers`,
 * which checks the owner and the row version.
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
    [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("active");
  const [draft, setDraft] = useState({ title: "", category: "CUSTOM", hours: "", minutes: "" }),
    [preset, setPreset] = useState<Preset | null>(null);
  const composer = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
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
      setMessage({ text: action === "delete" ? "Timer deleted." : "Timer saved." });
      return true;
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Timer update failed.", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }
  function choose(p: Preset) {
    setPreset(p);
    setDraft({
      title: p.title,
      category: p.category,
      hours: p.minutes ? String(Math.floor(p.minutes / 60)) : "",
      minutes: p.minutes ? String(p.minutes % 60) : "",
    });
    requestAnimationFrame(() =>
      composer.current
        ?.querySelector<HTMLElement>(p.minutes ? "button[type=submit]" : 'input[name="hours"]')
        ?.focus(),
    );
  }
  function openComposer() {
    composer.current?.scrollIntoView({ block: "center" });
    composer.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  }
  const totalMinutes = Number(draft.hours || 0) * 60 + Number(draft.minutes || 0);
  // A preset's time stays labelled as the guide's only while the player has not changed it
  const fromGuide = preset?.minutes !== undefined && preset.minutes === totalMinutes;
  const ready = (t: Timer) => t.status === "RUNNING" && now !== null && secondsLeft(t, now) === 0;
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
      const rank = (t: Timer) =>
        ready(t) ? 0 : t.status === "RUNNING" ? 1 : t.status === "PAUSED" ? 2 : 3;
      return (
        rank(a) - rank(b) ||
        (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity) ||
        a.title.localeCompare(b.title)
      );
    });
  const running = timers.filter((t) => t.status === "RUNNING" && !ready(t)).length,
    readyCount = timers.filter(ready).length;
  const empty = timers.length === 0;
  return (
    <>
      <WorkspaceHeading
        compact
        scene="economy"
        title="Personal timers"
        accent="timers"
        description="Crops, laborers, a buff running out: start the countdown here and check it from any device."
        icon="timer"
        actions={
          empty ? undefined : (
            // The composer sits beside the list on wide screens; this jumps to it below the list
            <button
              type="button"
              className={`button primary ${styles.jump}`}
              onClick={openComposer}
            >
              <Plus size={17} aria-hidden="true" /> Add timer
            </button>
          )
        }
      >
        {!empty && (
          <div className={`landing-chips ${styles.chips}`}>
            {readyCount > 0 && <span className="landing-chip">{readyCount} ready</span>}
            <span className="landing-chip is-muted">{running} running</span>
            <span className="landing-chip is-muted">Saved to your account</span>
          </div>
        )}
      </WorkspaceHeading>
      <div className={styles.layout} data-empty={empty ? "" : undefined}>
        {!empty && (
          <section className={`panel ${styles.list}`} aria-labelledby="timer-list-title">
            <PanelHead
              id="timer-list-title"
              title="Your timers"
              line="Ticks while a page is open. Outpost sends no notifications."
              actions={
                <div className={styles.listActions}>
                  <div className="segmented" role="group" aria-label="Timer status">
                    {filters.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                      >
                        {label} <span className={styles.count}>{counts[value]}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="pill-link is-small"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      refresh().catch(() =>
                        setMessage({ text: "Could not reload timers.", error: true }),
                      )
                    }
                  >
                    <RotateCcw size={14} aria-hidden="true" /> Reload
                  </button>
                </div>
              }
            />
            {message && (
              <StatusLine tone={message.error ? "error" : "default"}>{message.text}</StatusLine>
            )}
            {visible.length ? (
              <ul className={styles.rows} aria-label="Your timers">
                {visible.map((t) => (
                  <TimerRow key={t.id} timer={t} now={now} busy={busy} update={update} />
                ))}
              </ul>
            ) : (
              <EmptyWell
                emblem="team-calendar"
                title={filter === "completed" ? "No cleared timers" : "Nothing counting down"}
                line={
                  filter === "completed"
                    ? "Timers you clear when they are done wait here."
                    : "Start one from the presets."
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
        <section
          id="timer-composer"
          className={`panel ${styles.composer}`}
          aria-labelledby="timer-composer-title"
        >
          <PanelHead
            id="timer-composer-title"
            emblem="team-calendar"
            title={empty ? "Start your first timer" : "Start a timer"}
            line="Pick a wait, check the time and start it. Times you type yourself are labelled as yours."
          />
          <div className={styles.presets} role="group" aria-label="Timer presets">
            {presets.map((p) => (
              <button
                key={p.title}
                type="button"
                className={styles.preset}
                aria-pressed={preset?.title === p.title}
                onClick={() => choose(p)}
              >
                <strong>{p.title}</strong>
                <span data-manual={p.minutes ? undefined : ""}>
                  {p.minutes ? span(p.minutes * 60) : "Set the time"}
                </span>
              </button>
            ))}
          </div>
          <form
            ref={composer}
            className={styles.form}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await fetch("/api/timers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: draft.title,
                      category: draft.category,
                      durationMinutes: totalMinutes,
                    }),
                  }),
                  b = await r.json();
                if (!r.ok) throw new Error(b.error);
                await refresh();
                setDraft({ title: "", category: "CUSTOM", hours: "", minutes: "" });
                setPreset(null);
                setFilter("active");
                requestAnimationFrame(() =>
                  document
                    .getElementById(`timer-${b.id}`)
                    ?.querySelector<HTMLElement>("h2")
                    ?.focus(),
                );
                setMessage({ text: "Timer started. Refreshing the page will not reset it." });
              } catch (e) {
                setMessage({
                  text: e instanceof Error ? e.message : "Could not start the timer.",
                  error: true,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Timer title" className={styles.titleField}>
              <input
                name="title"
                maxLength={100}
                required
                placeholder="e.g. Island crops"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Category" className={styles.categoryField}>
              <WellSelect
                name="category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {timerCategories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </WellSelect>
            </Field>
            <fieldset className={styles.duration}>
              <legend>Duration</legend>
              <Field label="Hours">
                <NumberField
                  name="hours"
                  min={0}
                  max={500}
                  value={draft.hours}
                  onValueChange={(v) => setDraft({ ...draft, hours: v == null ? "" : String(v) })}
                />
              </Field>
              <Field label="Minutes">
                <NumberField
                  name="minutes"
                  min={0}
                  max={30000}
                  value={draft.minutes}
                  onValueChange={(v) => setDraft({ ...draft, minutes: v == null ? "" : String(v) })}
                />
              </Field>
              <p className={styles.source}>
                {fromGuide && preset?.source ? (
                  <>
                    Time from the{" "}
                    <Link className="text-link" href={preset.source.href}>
                      {preset.source.label}
                    </Link>
                  </>
                ) : totalMinutes > 0 ? (
                  "Your own time"
                ) : (
                  "Type the time you see in game"
                )}
              </p>
            </fieldset>
            <button
              type="submit"
              className={`button primary ${styles.start}`}
              disabled={busy || totalMinutes < 1 || totalMinutes > 30000 || !draft.title.trim()}
            >
              <Play size={16} aria-hidden="true" /> Start timer
            </button>
            {empty && message && (
              <StatusLine tone={message.error ? "error" : "default"}>{message.text}</StatusLine>
            )}
          </form>
        </section>
      </div>
    </>
  );
}

function TimerRow({
  timer: t,
  now,
  busy,
  update,
}: {
  timer: Timer;
  now: number | null;
  busy: boolean;
  update: (t: Timer, action: string, title?: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(t.title);
  const left = now === null ? null : secondsLeft(t, now);
  const total = Math.max(1, Math.round(t.durationMs / 1000));
  const done = t.status === "COMPLETED" || (t.status === "RUNNING" && left === 0);
  const progress = done ? 1 : left === null ? 0 : Math.min(1, Math.max(0, 1 - left / total));
  const state = t.status === "COMPLETED" ? "cleared" : done ? "ready" : t.status.toLowerCase();
  return (
    <li id={`timer-${t.id}`} className={styles.row} data-state={state}>
      <div className={styles.info}>
        <span className={`landing-chip is-muted ${styles.tag}`}>{timerCategory(t.category)}</span>
        {editing ? (
          <form
            className={styles.rename}
            onSubmit={async (e) => {
              e.preventDefault();
              if (await update(t, "rename", name)) setEditing(false);
            }}
          >
            <input
              aria-label="Timer name"
              maxLength={100}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            />
            <button className="button primary" disabled={busy}>
              Save
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setName(t.title);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <h2 tabIndex={-1} className={styles.title}>
            {t.title}
          </h2>
        )}
        <small className={styles.meta}>
          {t.status === "RUNNING" && t.dueAt ? (
            <>
              {/* The clock beside it is the countdown, so the line names the moment only. */}
              {done ? "Was due" : "Due"} <GameTime at={t.dueAt} />
            </>
          ) : t.status === "PAUSED" ? (
            "Paused, resume to keep counting"
          ) : (
            "Cleared"
          )}{" "}
          · {span(total)} in all
        </small>
      </div>
      <p className={styles.clock} aria-live="off">
        {left === null ? (
          <span className={styles.wait}>Updating…</span>
        ) : done ? (
          "Ready"
        ) : (
          clock(left)
        )}
      </p>
      <div
        className={styles.bar}
        role="progressbar"
        aria-label={`${t.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <b style={{ width: `${progress * 100}%` }} />
      </div>
      <div className={styles.actions}>
        {t.status === "RUNNING" && !done && (
          <button className="button secondary" disabled={busy} onClick={() => update(t, "pause")}>
            <Pause size={16} aria-hidden="true" /> Pause<span className="sr-only"> timer</span>
          </button>
        )}
        {t.status === "PAUSED" && (
          <button className="button primary" disabled={busy} onClick={() => update(t, "resume")}>
            <Play size={16} aria-hidden="true" /> Resume<span className="sr-only"> timer</span>
          </button>
        )}
        {done && (
          <button className="button primary" disabled={busy} onClick={() => update(t, "reset")}>
            <RotateCcw size={16} aria-hidden="true" /> Start again
          </button>
        )}
        {t.status === "RUNNING" && done && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => update(t, "complete")}
          >
            Clear
          </button>
        )}
        <span className={styles.tools}>
          {!done && (
            <button
              className={styles.icon}
              disabled={busy}
              aria-label="Restart timer"
              title="Restart from the full time"
              onClick={() => update(t, "reset")}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          )}
          <button
            className={styles.icon}
            disabled={busy || editing}
            aria-label="Rename timer"
            title="Rename"
            onClick={() => {
              setName(t.title);
              setEditing(true);
            }}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            className={`${styles.icon} ${styles.delete}`}
            disabled={busy}
            aria-label="Delete timer"
            title="Delete"
            onClick={() => {
              if (window.confirm(`Delete “${t.title}”?`)) update(t, "delete");
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </span>
      </div>
    </li>
  );
}

"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Plus, Trophy } from "lucide-react";
import Link from "@/components/link";
import type { GiveawayBoard as Board, GiveawayCard } from "@/lib/giveaways/service";
import {
  giveawayImageLabels,
  giveawayImages,
  maxWinners,
  phaseOf,
  prizeLine,
} from "@/lib/giveaways/display";
import { gameTime } from "@/lib/game-time";
import { regions } from "@/lib/albion/region-config";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { EditorDialog } from "./editor-dialog";
import { Field } from "./field";
import { WellSelect } from "./well-select";
import { NumberField } from "./number-field";
import { Disclosure } from "./disclosure";
import styles from "./giveaways.module.css";

const place = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`;
const plural = (n: number, word: string) =>
  `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;
/** The browser's local "YYYY-MM-DDTHH:mm" for a datetime-local field. */
function localInput(iso: string) {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** "1d 04h 12m" a day or more out, then "04:12:09"; fixed-width digits so ticks never shift. */
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const [d, h, m] = [
    Math.floor(s / 86_400),
    Math.floor((s % 86_400) / 3600),
    Math.floor((s % 3600) / 60),
  ];
  return d ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

/**
 * Time left to enter, ticking each second on its own so the board does not re-render. Starts at
 * the board's clock (so hydration matches) and tells the board when entries close.
 */
function Countdown({ to, now, onDone }: { to: number; now: number; onDone: (at: number) => void }) {
  const [at, setAt] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = Date.now();
      setAt(next);
      if (next >= to) {
        clearInterval(timer);
        onDone(next);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [to, onDone]);
  return <>{countdown(to - at)}</>;
}

const stateLabel = {
  open: "Open",
  entered: "Entered",
  closed: "Draw pending",
  won: "Won",
  ended: "Ended",
  cancelled: "Cancelled",
} as const;

/**
 * A list of giveaways with the viewer's own part in each: enter or leave while entries are open,
 * their place once drawn. Players with the right (Outpost staff for site-wide giveaways, Manage
 * giveaways in a Team) also start, edit, cancel and draw. The server re-checks every one of these
 * and returns the board as it now stands; the buttons only follow the rights it reported.
 */
export function GiveawayBoard({
  initial,
  endpoint,
  scope,
  host,
  defaultRegion,
  now,
  signIn,
}: {
  initial: Board;
  /** `/api/giveaways` or `/api/groups/<id>/giveaways`. */
  endpoint: string;
  scope: "site" | "team";
  /** Who runs these giveaways: "Outpost staff" or the Team's name. */
  host: string;
  defaultRegion: string;
  /** When the board was read, so open/closed match on hydration. */
  now: number;
  /** For guests: the sign-in page that comes back here. */
  signIn?: string;
}) {
  const [board, setBoard] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<GiveawayCard | "new" | null>(null);
  const [confirming, setConfirming] = useState("");
  // Starts at the server's clock (so hydration matches); a countdown moves it on when entries
  // close, so that giveaway shows as closed without a reload.
  const [clock, setClock] = useState(now);

  async function send(action: Record<string, unknown>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not save the change");
      setBoard(body.board);
      setMessage(done);
      setConfirming("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the change");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Entries still open first (closing soonest), then those waiting for their draw
  const live = board.giveaways.filter((g) => g.status === "OPEN");
  const active = [
    ...live.filter((g) => phaseOf(g, clock) === "open"),
    ...live.filter((g) => phaseOf(g, clock) === "closed"),
  ];
  const ended = board.giveaways.filter((g) => g.status !== "OPEN");
  const where = (g: GiveawayCard) =>
    `${regions[g.region as keyof typeof regions]?.label ?? g.region} server`;
  const art = (g: GiveawayCard, size: number) => (
    <span className={styles.art} aria-hidden="true">
      {g.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
        <img src={`/albion/icons/${g.image}.webp`} alt="" width={size} height={size} />
      ) : (
        <Gift size={Math.round(size / 2)} />
      )}
    </span>
  );
  const winnersOf = (g: GiveawayCard) =>
    g.winners.length ? (
      <ol className={styles.winners} aria-label="Winners">
        {g.winners.map((w) => (
          <li key={w.place}>
            <span className={styles.place}>{place(w.place)}</span> {w.name}
          </li>
        ))}
      </ol>
    ) : (
      <p className={styles.meta}>Nobody had entered, so there are no winners.</p>
    );

  const manage = (g: GiveawayCard, closed: boolean) => {
    const ask = (kind: string) => confirming === `${g.id}:${kind}`;
    return (
      <div className={styles.manage}>
        {closed &&
          (ask("draw") ? (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() =>
                send({ action: "draw", id: g.id }, "Winners drawn. The list is final.")
              }
            >
              Confirm: draw {plural(Math.min(g.winnerCount, g.entries), "winner")}
            </button>
          ) : (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              aria-label={`Draw winners for ${g.title}`}
              onClick={() => setConfirming(`${g.id}:draw`)}
            >
              Draw winners
            </button>
          ))}
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          aria-label={`Edit ${g.title}`}
          onClick={() => {
            setError("");
            setEditing(g);
          }}
        >
          Edit
        </button>
        {ask("cancel") ? (
          <button
            type="button"
            className={`button secondary ${styles.loss}`}
            disabled={busy}
            onClick={() => send({ action: "cancel", id: g.id }, "Giveaway cancelled.")}
          >
            Confirm cancel
          </button>
        ) : (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            aria-label={`Cancel ${g.title}`}
            onClick={() => setConfirming(`${g.id}:cancel`)}
          >
            Cancel
          </button>
        )}
      </div>
    );
  };

  /** An open giveaway, or one waiting for its draw: a raised card with the countdown. */
  const card = (g: GiveawayCard) => {
    const closed = phaseOf(g, clock) === "closed";
    const state = closed ? "closed" : g.entered ? "entered" : "open";
    const closes = new Date(g.closesAt);
    return (
      <li
        key={g.id}
        className={`raised ${styles.card}`}
        data-state={state}
        aria-labelledby={`giveaway-${g.id}`}
      >
        <div className={styles.head}>
          {art(g, 48)}
          <div className={styles.heading}>
            <p className={styles.host}>
              {host}
              {scope === "team" && " · Members only"}
            </p>
            <h3 id={`giveaway-${g.id}`} className={styles.title}>
              {g.title}
            </h3>
          </div>
          <span className={styles.state} data-state={state}>
            {state === "entered" && <Check size={14} aria-hidden="true" />}
            {stateLabel[state]}
          </span>
        </div>
        <p className={`${styles.prize} preserve`}>
          <span className={styles.label}>Prize</span>
          {g.prize}
        </p>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.value}>
              {closed ? (
                "Closed"
              ) : (
                <Countdown to={closes.getTime()} now={clock} onDone={setClock} />
              )}
            </span>{" "}
            <span className={styles.label}>{closed ? "to new entries" : "left to enter"}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.value}>{g.entries.toLocaleString("en")}</span>{" "}
            <span className={styles.label}>{g.entries === 1 ? "entrant" : "entrants"}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.value}>{g.winnerCount.toLocaleString("en")}</span>{" "}
            <span className={styles.label}>{g.winnerCount === 1 ? "winner" : "winners"}</span>
          </span>
        </div>
        <p className={styles.meta}>
          {where(g)} · {closed ? "Entries closed" : "Entries close"}{" "}
          <time dateTime={g.closesAt}>{gameTime(closes)}</time>
        </p>
        {g.rules && (
          <Disclosure summary="Rules">
            <p className="preserve">{g.rules}</p>
          </Disclosure>
        )}
        <div className={styles.foot}>
          {closed ? (
            <p className={styles.meta}>
              {g.entered ? "You are entered. " : "Entries closed. "}Winners are drawn soon.
            </p>
          ) : !board.signedIn ? (
            signIn && (
              <Link className={`button primary ${styles.go}`} href={signIn}>
                Sign in to enter
              </Link>
            )
          ) : g.entered ? (
            <>
              <p className={styles.entered}>
                <Check size={16} aria-hidden="true" /> You are entered
              </p>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                aria-label={`Leave ${g.title}`}
                onClick={() => send({ action: "leave", id: g.id }, "You left the giveaway.")}
              >
                Leave
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`button primary ${styles.go}`}
              disabled={busy}
              aria-label={`Enter ${g.title}`}
              onClick={() => send({ action: "enter", id: g.id }, "You are entered. Good luck.")}
            >
              Enter giveaway
            </button>
          )}
        </div>
        {board.canManage && manage(g, closed)}
      </li>
    );
  };

  /** A drawn or cancelled giveaway: one quiet row with its winners. */
  const row = (g: GiveawayCard) => {
    const drawn = g.status === "DRAWN";
    const state = !drawn ? "cancelled" : g.place ? "won" : "ended";
    return (
      <li key={g.id} className={styles.row} aria-labelledby={`giveaway-${g.id}`}>
        {art(g, 36)}
        <div className={styles.rowBody}>
          <h3 id={`giveaway-${g.id}`} className={styles.rowTitle}>
            {g.title}
          </h3>
          <p className={`${styles.rowPrize} preserve`}>{g.prize}</p>
          <p className={styles.meta}>
            {where(g)} ·{" "}
            {drawn && g.drawnAt ? (
              <>
                Drawn <time dateTime={g.drawnAt}>{gameTime(new Date(g.drawnAt))}</time>
              </>
            ) : (
              "Cancelled before the draw"
            )}{" "}
            · {plural(g.entries, "entrant")}
          </p>
          {drawn && winnersOf(g)}
        </div>
        <div className={styles.rowSide}>
          <span className={styles.state} data-state={state}>
            {state === "won" && <Trophy size={14} aria-hidden="true" />}
            {state === "won" && g.place ? `You won · ${place(g.place)}` : stateLabel[state]}
          </span>
          {drawn && g.entered && !g.place && (
            <span className={styles.meta}>Not drawn this time</span>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={styles.board}>
      {error && !editing && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p role="status" className={message ? styles.saved : "sr-only"}>
        {message}
      </p>
      <section className={styles.open} aria-labelledby={`${scope}-giveaways-open`}>
        <div className={`raised ${styles.bar}`}>
          <PanelHead
            id={`${scope}-giveaways-open`}
            emblem="trophy-gold"
            title={
              <>
                Open <em>giveaways</em>
              </>
            }
            line={prizeLine}
            actions={
              board.canManage ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setEditing("new");
                  }}
                >
                  <Plus size={17} aria-hidden="true" /> Start a giveaway
                </button>
              ) : undefined
            }
          />
          {!active.length && (
            <EmptyWell
              emblem="trophy-silver"
              title="No open giveaways right now"
              line={
                board.canManage
                  ? "Start one to set the prize, how many win and when entries close."
                  : scope === "site"
                    ? "Outpost staff start giveaways here. Check back soon."
                    : "Members with Manage giveaways start them here. Check back soon."
              }
            />
          )}
        </div>
        {active.length > 0 && <ul className={styles.grid}>{active.map(card)}</ul>}
      </section>
      {ended.length > 0 && (
        <section className={`panel ${styles.panel}`} aria-labelledby={`${scope}-giveaways-ended`}>
          <PanelHead
            id={`${scope}-giveaways-ended`}
            title="Ended"
            line="The server draws winners once, at random, after entries close. The list never changes after that."
          />
          <ul className={styles.rows}>{ended.map(row)}</ul>
        </section>
      )}
      {board.canManage && (
        <GiveawayDialog
          editing={editing}
          busy={busy}
          error={error}
          defaultRegion={defaultRegion}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            const ok = await send(
              editing === "new" || !editing
                ? { action: "create", ...fields }
                : { action: "update", id: editing.id, version: editing.version, ...fields },
              editing === "new" ? "Giveaway started." : "Giveaway saved.",
            );
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function GiveawayDialog({
  editing,
  busy,
  error,
  defaultRegion,
  onClose,
  onSave,
}: {
  editing: GiveawayCard | "new" | null;
  busy: boolean;
  /** The server's refusal, said inside the dialog so it is not hidden behind it. */
  error: string;
  defaultRegion: string;
  onClose: () => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const current = editing && editing !== "new" ? editing : null;
  return (
    <EditorDialog
      open={!!editing}
      title={current ? "Edit giveaway" : "Start a giveaway"}
      onClose={onClose}
      className={styles.dialog}
    >
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const closes = new Date(String(f.get("closesAt")));
          await onSave({
            title: f.get("title"),
            prize: f.get("prize"),
            region: f.get("region"),
            winnerCount: Number(f.get("winnerCount")),
            closesAt: Number.isFinite(closes.getTime()) ? closes.toISOString() : "",
            image: f.get("image") || null,
            rules: f.get("rules") || "",
          });
        }}
      >
        <div className={styles.formGrid}>
          <Field label="Title" wide>
            <input
              name="title"
              required
              minLength={3}
              maxLength={100}
              defaultValue={current?.title}
              placeholder="e.g. Weekend mount giveaway"
            />
          </Field>
          <Field label="Prize" wide hint="What the winners get, handed over in game.">
            <textarea
              name="prize"
              required
              maxLength={500}
              rows={3}
              defaultValue={current?.prize}
              placeholder="e.g. One T8 Swiftclaw each"
            />
          </Field>
          <fieldset className={styles.images}>
            <legend>Picture</legend>
            <label>
              <input type="radio" name="image" value="" defaultChecked={!current?.image} />
              <span className={styles.pick} aria-hidden="true">
                <Gift size={22} />
              </span>
              <span>None</span>
            </label>
            {giveawayImages.map((name) => (
              <label key={name}>
                <input
                  type="radio"
                  name="image"
                  value={name}
                  defaultChecked={current?.image === name}
                />
                <span className={styles.pick} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                  <img src={`/albion/icons/${name}.webp`} alt="" width={40} height={40} />
                </span>
                <span>{giveawayImageLabels[name]}</span>
              </label>
            ))}
          </fieldset>
          <Field label="Server">
            <WellSelect name="region" defaultValue={current?.region ?? defaultRegion}>
              {Object.entries(regions).map(([key, r]) => (
                <option key={key} value={key}>
                  {r.label}
                </option>
              ))}
            </WellSelect>
          </Field>
          <Field label="Winners">
            <NumberField
              name="winnerCount"
              min={1}
              max={maxWinners}
              required
              defaultValue={current?.winnerCount ?? 1}
            />
          </Field>
          <Field
            label="Entries close (your device time)"
            wide
            hint="At least five minutes and at most six months from now."
          >
            <input
              name="closesAt"
              type="datetime-local"
              required
              defaultValue={current ? localInput(current.closesAt) : undefined}
            />
          </Field>
          <Field label="Rules (optional)" wide hint="Who can win and how the prize is handed over.">
            <textarea name="rules" maxLength={4000} rows={4} defaultValue={current?.rules} />
          </Field>
        </div>
        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            {/supporter/i.test(error) && (
              <Link className="button secondary" href="/supporter">
                See the Supporter plan <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
        <div className={styles.formActions}>
          <button type="button" className="button secondary" onClick={onClose}>
            Not now
          </button>
          <button className="button primary" disabled={busy}>
            {current ? "Save giveaway" : "Start giveaway"}
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Gift, Plus } from "lucide-react";
import Link from "@/components/link";
import type { GiveawayBoard as Board, GiveawayCard } from "@/lib/giveaways/service";
import {
  giveawayImageLabels,
  giveawayImages,
  maxWinners,
  phaseOf,
  prizeLine,
} from "@/lib/giveaways/display";
import { gameTime, relativeTime } from "@/lib/game-time";
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
  defaultRegion,
  now,
  signIn,
  locked = false,
}: {
  initial: Board;
  /** `/api/giveaways` or `/api/groups/<id>/giveaways`. */
  endpoint: string;
  scope: "site" | "team";
  defaultRegion: string;
  /** When the board was read, so open/closed match on hydration. */
  now: number;
  /** For guests: the sign-in page that comes back here. */
  signIn?: string;
  /** A Team whose owner is no longer a Supporter: the management buttons are hidden. */
  locked?: boolean;
}) {
  const [board, setBoard] = useState(initial);
  const canManage = board.canManage && !locked;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<GiveawayCard | "new" | null>(null);
  const [confirming, setConfirming] = useState("");
  // Starts at the server's clock (so hydration matches), then keeps time, so a giveaway whose
  // entries just closed shows as closed without a reload.
  const [clock, setClock] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  const open = board.giveaways.filter((g) => g.status === "OPEN");
  const recent = board.giveaways.filter((g) => g.status !== "OPEN");
  const who = scope === "site" ? "Outpost staff" : "Members with Manage giveaways";
  const start = canManage ? (
    <button
      type="button"
      className="button primary"
      disabled={busy}
      onClick={() => setEditing("new")}
    >
      <Plus size={17} aria-hidden="true" /> Start a giveaway
    </button>
  ) : undefined;

  const card = (g: GiveawayCard) => {
    const phase = phaseOf(g, clock);
    const closes = new Date(g.closesAt);
    const ask = (kind: string) => confirming === `${g.id}:${kind}`;
    return (
      <li key={g.id} className={`well ${styles.card}`} aria-labelledby={`giveaway-${g.id}`}>
        <span className={styles.art} aria-hidden="true">
          {g.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
            <img src={`/albion/icons/${g.image}.webp`} alt="" width={56} height={56} />
          ) : (
            <Gift size={26} />
          )}
        </span>
        <div className={styles.body}>
          <h3 id={`giveaway-${g.id}`} className={styles.title}>
            {g.title}
          </h3>
          <p className={`${styles.prize} preserve`}>{g.prize}</p>
          <div className={`landing-chips ${styles.chips}`}>
            <span className="landing-chip is-muted">
              {regions[g.region as keyof typeof regions]?.label ?? g.region} server
            </span>
            <span className="landing-chip is-muted">{plural(g.winnerCount, "winner")}</span>
            {phase === "open" && <span className="landing-chip">Open</span>}
            {phase === "closed" && (
              <span className="landing-chip is-muted">Entries closed · draw pending</span>
            )}
            {phase === "drawn" && <span className="landing-chip is-muted">Drawn</span>}
            {phase === "cancelled" && <span className="landing-chip is-muted">Cancelled</span>}
          </div>
          <p className={styles.meta}>
            {phase === "drawn" && g.drawnAt ? (
              <>
                Drawn {gameTime(new Date(g.drawnAt))} by {g.drawnBy}
              </>
            ) : phase === "cancelled" ? (
              <>Cancelled before the draw</>
            ) : (
              <>
                {phase === "open" ? "Closes" : "Closed"}{" "}
                <time dateTime={g.closesAt}>{gameTime(closes)}</time> ·{" "}
                {relativeTime(closes, clock)}
              </>
            )}
            {" · "}
            <span className={styles.figure}>{g.entries.toLocaleString("en")}</span>{" "}
            {g.entries === 1 ? "entry" : "entries"}
          </p>
          {g.rules && (
            <Disclosure summary="Rules">
              <p className="preserve">{g.rules}</p>
            </Disclosure>
          )}
          {phase === "drawn" && (
            <div className={styles.winners}>
              <p className={styles.label}>Winners</p>
              {g.winners.length ? (
                <ol>
                  {g.winners.map((w) => (
                    <li key={w.place}>
                      <span className={styles.figure}>{place(w.place)}</span> {w.name}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.meta}>Nobody had entered, so there are no winners.</p>
              )}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          {/* The viewer's own part */}
          {phase === "open" &&
            (!board.signedIn ? (
              signIn && (
                <Link className="button primary" href={signIn}>
                  Sign in to enter
                </Link>
              )
            ) : g.entered ? (
              <>
                <span className={`landing-chip ${styles.status}`}>You are entered</span>
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
                className="button primary"
                disabled={busy}
                aria-label={`Enter ${g.title}`}
                onClick={() => send({ action: "enter", id: g.id }, "You are entered. Good luck.")}
              >
                Enter giveaway
              </button>
            ))}
          {phase === "closed" && g.entered && (
            <span className="landing-chip is-muted">You are entered</span>
          )}
          {phase === "drawn" && g.place && (
            <span className={`landing-chip ${styles.won}`}>You won · {place(g.place)}</span>
          )}
          {phase === "drawn" && g.entered && !g.place && (
            <span className="landing-chip is-muted">Not drawn this time</span>
          )}
          {/* Running it */}
          {canManage && g.status === "OPEN" && (
            <div className={styles.manage}>
              {phase === "closed" &&
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
                onClick={() => setEditing(g)}
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
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={styles.board}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p role="status" className={message ? styles.saved : "sr-only"}>
        {message}
      </p>
      <section className={`panel ${styles.panel}`} aria-labelledby={`${scope}-giveaways-open`}>
        <PanelHead
          id={`${scope}-giveaways-open`}
          emblem="trophy-gold"
          title={
            <>
              Open <em>giveaways</em>
            </>
          }
          line={
            open.length ? `${plural(open.length, "giveaway")}, closing soonest first.` : prizeLine
          }
          actions={start}
        />
        {open.length ? (
          <>
            <ul className={styles.list}>{open.map(card)}</ul>
            <p className={styles.note}>{prizeLine}</p>
          </>
        ) : (
          <EmptyWell
            emblem="trophy-silver"
            title="No open giveaways right now"
            line={
              canManage
                ? "Start one: set the prize, how many win and when entries close."
                : `${who} start giveaways here. Check back soon.`
            }
            action={start}
          />
        )}
      </section>
      <section className={`panel ${styles.panel}`} aria-labelledby={`${scope}-giveaways-recent`}>
        <PanelHead
          id={`${scope}-giveaways-recent`}
          title="Recent draws"
          line="Winners are drawn once by the server, at random, after entries close. The list never changes after the draw."
        />
        {recent.length ? (
          <ul className={styles.list}>{recent.map(card)}</ul>
        ) : (
          <EmptyWell title="No draws yet" line="Finished giveaways and their winners show here." />
        )}
      </section>
      {canManage && (
        <GiveawayDialog
          editing={editing}
          busy={busy}
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
  defaultRegion,
  onClose,
  onSave,
}: {
  editing: GiveawayCard | "new" | null;
  busy: boolean;
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
          <Field label="Entries close (your device time)" wide>
            <input
              name="closesAt"
              type="datetime-local"
              required
              defaultValue={current ? localInput(current.closesAt) : undefined}
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
          <Field label="Rules (optional)" wide hint="Who can win and how the prize is handed over.">
            <textarea name="rules" maxLength={4000} rows={4} defaultValue={current?.rules} />
          </Field>
        </div>
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

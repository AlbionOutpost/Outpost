"use client";
import { useEffect, useState } from "react";
import { Dices, RotateCcw } from "lucide-react";
import type { TeamGamesView } from "@/lib/groups/economy-service";
import { EmptyWell } from "./empty-well";
import { Field } from "./group-parts";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { Coin3D, RollDrum, silverText } from "./economy-stage";
import { operationKey, shortTime } from "./team-wallet";
import teams from "./teams.module.css";
import styles from "./team-economy.module.css";

type Member = { userId: string; name: string };
type Flip = TeamGamesView["flips"][number];
type Roll = TeamGamesView["rolls"][number];
type Side = "heads" | "tails";
const sideName = { heads: "Heads", tails: "Tails" };
const sideArt = { heads: "/albion/charges/crown.webp", tails: "/albion/charges/skull.webp" };

function SideLabel({ side }: { side: Side }) {
  return (
    <span className={styles.sideLabel}>
      {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
      <img src={sideArt[side]} alt="" />
      {sideName[side]}
    </span>
  );
}

/**
 * Coin flips and loot rolls for a team. The server throws the coin and rolls the dice inside
 * the write; the coin and the number drums only show what it decided, after the fact.
 */
export function TeamGames({
  groupId,
  userId,
  members,
  active,
  locked,
}: {
  groupId: string;
  userId: string;
  members: Member[];
  active: boolean;
  locked: boolean;
}) {
  const [view, setView] = useState<TeamGamesView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loadedFor, setLoadedFor] = useState(-1);
  // Coin flip form
  const [mode, setMode] = useState<"duel" | "call">("duel");
  const [heads, setHeads] = useState(userId);
  const [tails, setTails] = useState("");
  const [call, setCall] = useState<Side>("heads");
  const [flipKey, setFlipKey] = useState(operationKey);
  const [thrown, setThrown] = useState<{ side: Side; key: string; flip: Flip } | null>(null);
  const [landed, setLanded] = useState(true);
  // Loot roll form and the roll being drawn
  const [title, setTitle] = useState("");
  const [rollSilver, setRollSilver] = useState("");
  const [potShare, setPotShare] = useState(false);
  const [rollKey, setRollKey] = useState(operationKey);
  const [spinning, setSpinning] = useState<{ rollId: string; key: string } | null>(null);
  const [tieThrow, setTieThrow] = useState<string | null>(null);

  useEffect(() => {
    if (!active || loadedFor === attempt) return;
    const controller = new AbortController();
    fetch(`/api/groups/${groupId}/games`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setView(body.games);
        setLoadedFor(attempt);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Rolls and flips could not be loaded.");
      });
    return () => controller.abort();
  }, [active, attempt, loadedFor, groupId]);
  // While a roll is open, look again now and then.
  const waiting = !!view && view.rolls.some((r) => r.status === "OPEN");
  useEffect(() => {
    if (!active || !waiting) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setAttempt((n) => n + 1);
    }, 20_000);
    return () => clearInterval(timer);
  }, [active, waiting]);

  const name = (id: string | null | undefined) =>
    !id
      ? "Nobody"
      : id === userId
        ? "You"
        : members.find((m) => m.userId === id)?.name || view?.names[id] || "Former team member";

  async function play(action: Record<string, unknown>, label: string) {
    setBusy(label);
    setError("");
    try {
      const response = await fetch(`/api/groups/${groupId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setView(body.games);
      return body as { flip?: Flip; roll?: Roll; value?: number };
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not go through.");
      return null;
    } finally {
      setBusy("");
    }
  }

  function throwCoin(flip: Flip) {
    setLanded(false);
    setThrown({ side: flip.outcome as Side, key: flip.id, flip });
  }

  async function flip() {
    const result = await play(
      mode === "call"
        ? { action: "call", key: flipKey, call }
        : { action: "flip", key: flipKey, headsId: heads, tailsId: tails },
      "flip",
    );
    if (!result?.flip) return;
    setFlipKey(operationKey());
    throwCoin(result.flip);
  }

  if (!view)
    return (
      <section className={`${styles.economy} ${teams.panel} panel`} aria-label="Rolls and flips">
        {error ? (
          <>
            <StatusLine tone="error">{error}</StatusLine>
            <div className={teams.rowActions}>
              <button
                type="button"
                className="pill-link is-small"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          </>
        ) : (
          <StatusLine>Loading rolls and flips…</StatusLine>
        )}
      </section>
    );

  const shown = thrown?.flip ?? view.flips.find((f) => !f.rollId) ?? null;
  const verdict = (f: Flip) => {
    if (f.tailsId)
      return {
        head: `${sideName[f.outcome as Side]}: ${name(f.winnerId)} ${f.winnerId === userId ? "win" : "wins"}`,
        line: `${name(f.headsId)} (heads) against ${name(f.tailsId)} (tails)`,
      };
    return {
      head: `${sideName[f.outcome as Side]}: ${name(f.headsId)} ${f.winnerId ? "called it" : "lost the call"}`,
      line: `${name(f.headsId)} called ${f.call}`,
    };
  };
  const flipReady = mode === "call" || (!!heads && !!tails && heads !== tails);
  const open = view.rolls.filter((r) => r.status === "OPEN");
  const past = view.rolls.filter((r) => r.status !== "OPEN");
  const rollWhole = /^\d*$/.test(rollSilver) ? Number(rollSilver || 0) : NaN;

  // A plain render function, not a component, so a re-render never remounts a spinning drum.
  function rollCard(roll: Roll) {
    const mine = roll.entries.find((e) => e.userId === userId);
    const spin = spinning?.rollId === roll.id ? spinning.key : null;
    const tie = view!.flips.find((f) => f.rollId === roll.id);
    const top = roll.entries[0]?.value;
    return (
      <article key={roll.id} className={`well ${styles.rollCard}`} data-state={roll.status}>
        <div className={styles.rollHead}>
          <div>
            <h3>{roll.title}</h3>
            <p>
              Opened by {name(roll.createdById)} · {shortTime(roll.createdAt)}
              {roll.silver > 0 &&
                ` · ${silverText(roll.silver)} silver shared among everyone who rolls${roll.potShare ? " and the pot" : ""}`}
            </p>
          </div>
          <span className={styles.kind}>
            {roll.status === "OPEN"
              ? `${roll.entries.length} rolled`
              : roll.status === "CANCELLED"
                ? "Cancelled"
                : roll.winnerId
                  ? `Won by ${name(roll.winnerId)}`
                  : "No rolls"}
          </span>
        </div>
        <div className={styles.rollBody}>
          <div className={styles.rollMine}>
            <RollDrum
              value={mine ? mine.value : null}
              spin={spin}
              onLanded={() => setSpinning(null)}
            />
            {roll.status === "OPEN" && !mine && !locked ? (
              <button
                type="button"
                className="button primary"
                disabled={!!busy}
                onClick={async () => {
                  const result = await play({ action: "roll", rollId: roll.id }, `roll-${roll.id}`);
                  if (result?.value) setSpinning({ rollId: roll.id, key: operationKey() });
                }}
              >
                <Dices size={17} aria-hidden="true" />
                {busy === `roll-${roll.id}` ? "Rolling…" : "Roll 1–100"}
              </button>
            ) : (
              <small className={styles.note}>
                {mine ? (spin ? "Rolling…" : `You rolled ${mine.value}`) : "You did not roll"}
              </small>
            )}
          </div>
          {roll.entries.length ? (
            <ol className={styles.rolls} aria-label={`Rolls for ${roll.title}`}>
              {roll.entries.map((e, i) => {
                const hidden = spin && e.userId === userId;
                return (
                  <li
                    key={e.userId}
                    data-win={roll.winnerId === e.userId ? "" : undefined}
                    data-me={e.userId === userId ? "" : undefined}
                  >
                    {roll.winnerId === e.userId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- painted trophy
                      <img src="/albion/icons/trophy-gold-64w.webp" alt="Winner" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                    <strong>{name(e.userId)}</strong>
                    <data value={hidden ? "" : e.value}>{hidden ? "…" : e.value}</data>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.note}>
              {roll.status === "OPEN" ? "Nobody has rolled yet." : "Nobody rolled."}
            </p>
          )}
        </div>
        {roll.tieBreak && roll.winnerId && (
          <div className={styles.sides}>
            {tie?.outcome ? (
              <>
                <Coin3D
                  size={56}
                  flip={{
                    side: tie.outcome as Side,
                    key: tieThrow === roll.id ? tie.id : `still-${tie.id}`,
                  }}
                  still={tieThrow !== roll.id}
                />
                <p className={styles.note}>
                  Tie at {top}: a coin flip landed {tie.outcome} for {name(roll.winnerId)}.
                </p>
              </>
            ) : (
              <p className={styles.note}>
                Tie at {top}: the server drew {name(roll.winnerId)} from the tied members.
              </p>
            )}
          </div>
        )}
        {roll.status === "OPEN" && view!.canRun && !locked && (
          <div className={teams.rowActions}>
            <button
              type="button"
              className="button secondary"
              disabled={!!busy || (roll.silver > 0 && !view!.canPay)}
              onClick={async () => {
                const result = await play(
                  { action: "roll-close", rollId: roll.id },
                  `close-${roll.id}`,
                );
                if (result?.roll?.tieBreak) setTieThrow(roll.id);
              }}
            >
              {busy === `close-${roll.id}` ? "Closing…" : "Close and name the winner"}
            </button>
            <button
              type="button"
              className="pill-link is-small"
              disabled={!!busy}
              onClick={() => {
                if (confirm(`Cancel the roll for ${roll.title}? Nobody wins and no silver moves.`))
                  void play({ action: "roll-cancel", rollId: roll.id }, `cancel-${roll.id}`);
              }}
            >
              Cancel roll
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <section className={styles.economy} aria-label="Rolls and flips">
      {error && (
        <p role="alert" className={teams.alert}>
          {error}
        </p>
      )}
      <section className={`panel ${teams.panel}`} aria-labelledby="coin-flip">
        <PanelHead
          id="coin-flip"
          emblem="trophy-silver-64w"
          title="Coin flip"
          line="Settle a tie or a decision. The server throws the coin; everyone in the team sees the result. No silver moves on a flip."
        />
        <div className={styles.arena}>
          <div className={styles.arenaStage}>
            <Coin3D
              flip={
                thrown
                  ? { side: thrown.side, key: thrown.key }
                  : shown
                    ? { side: shown.outcome as Side, key: `rest-${shown.id}` }
                    : null
              }
              // The last flip rests on the side it landed; a new throw animates.
              still={!thrown}
              onLanded={() => setLanded(true)}
            />
            <p className={styles.verdict} aria-live="polite">
              {!landed ? (
                <strong>Flipping…</strong>
              ) : shown?.outcome ? (
                <>
                  <strong>{verdict(shown).head}</strong>
                  <span>{verdict(shown).line}</span>
                </>
              ) : (
                <>
                  <strong>Crown or skull</strong>
                  <span>Crown is heads, skull is tails.</span>
                </>
              )}
            </p>
          </div>
          {locked ? (
            <StatusLine>
              Flips and rolls open again when the team&apos;s plan is renewed.
            </StatusLine>
          ) : (
            <form
              className={styles.stack}
              onSubmit={(e) => {
                e.preventDefault();
                if (flipReady) void flip();
              }}
            >
              <div className="segmented" role="group" aria-label="Flip type">
                <button
                  type="button"
                  aria-pressed={mode === "duel"}
                  onClick={() => setMode("duel")}
                >
                  Two players
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "call"}
                  onClick={() => setMode("call")}
                >
                  Call it yourself
                </button>
              </div>
              {mode === "duel" ? (
                <>
                  <div className={styles.sides}>
                    <Field label={<SideLabel side="heads" />}>
                      <WellSelect
                        aria-label="Heads player"
                        value={heads}
                        onChange={(e) => setHeads(e.target.value)}
                      >
                        <option value="">Choose a member</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.userId === userId ? `${m.name} (you)` : m.name}
                          </option>
                        ))}
                      </WellSelect>
                    </Field>
                    <Field label={<SideLabel side="tails" />}>
                      <WellSelect
                        aria-label="Tails player"
                        value={tails}
                        onChange={(e) => setTails(e.target.value)}
                      >
                        <option value="">Choose a member</option>
                        {members
                          .filter((m) => m.userId !== heads)
                          .map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.userId === userId ? `${m.name} (you)` : m.name}
                            </option>
                          ))}
                      </WellSelect>
                    </Field>
                  </div>
                </>
              ) : (
                <div className="segmented" role="radiogroup" aria-label="Your call">
                  {(["heads", "tails"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      role="radio"
                      aria-checked={call === side}
                      onClick={() => setCall(side)}
                    >
                      <SideLabel side={side} />
                    </button>
                  ))}
                </div>
              )}
              <div className={teams.formActions}>
                <button className="button primary" disabled={!!busy || !flipReady || !landed}>
                  {busy === "flip" ? "Throwing…" : "Flip the coin"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <div className={styles.columns}>
        <section className={`panel ${teams.panel}`} aria-labelledby="loot-rolls">
          <PanelHead
            id="loot-rolls"
            emblem="trophy-gold-64w"
            title="Loot rolls"
            line="One roll each, 1 to 100. The highest takes the drop when an officer closes the roll."
            actions={
              <button
                type="button"
                className="pill-link is-small"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RotateCcw size={14} aria-hidden="true" /> Refresh
              </button>
            }
          />
          {view.canRun && !locked && (
            <form
              className={`well ${styles.rollCard}`}
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await play(
                  {
                    action: "roll-open",
                    key: rollKey,
                    title: title.trim(),
                    silver: rollWhole,
                    potShare,
                  },
                  "open",
                );
                if (result?.roll) {
                  setRollKey(operationKey());
                  setTitle("");
                  setRollSilver("");
                  setPotShare(false);
                }
              }}
            >
              <div className={teams.formGrid}>
                <Field label="Drop">
                  <input
                    aria-label="Drop"
                    maxLength={100}
                    value={title}
                    placeholder="Bloodletter 8.3, a mount, a chest key…"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field
                  label="Silver to share (optional)"
                  hint={
                    view.canPay
                      ? "Split evenly among everyone who rolls, into their wallets."
                      : "Needs Manage wallet."
                  }
                >
                  <input
                    aria-label="Silver to share"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    disabled={!view.canPay}
                    value={rollSilver}
                    onChange={(e) =>
                      setRollSilver(e.target.value.replace(/[^\d]/g, "").slice(0, 13))
                    }
                  />
                </Field>
              </div>
              {rollWhole > 0 && (
                <label className={styles.sideLabel}>
                  <input
                    type="checkbox"
                    checked={potShare}
                    onChange={(e) => setPotShare(e.target.checked)}
                  />
                  The team pot takes one share
                </label>
              )}
              <div className={teams.formActions}>
                <button
                  className="button primary"
                  disabled={!!busy || !title.trim() || Number.isNaN(rollWhole)}
                >
                  {busy === "open" ? "Opening…" : "Open a roll"}
                </button>
              </div>
            </form>
          )}
          {open.map(rollCard)}
          {!open.length && !past.length && (
            <EmptyWell
              emblem="trophy-gold-64w"
              title="No loot rolls yet"
              line={
                view.canRun
                  ? "Open a roll for a drop; members roll once each and the highest takes it."
                  : "Members with Manage loot splits open rolls for drops here."
              }
            />
          )}
          {past.length > 0 && (
            <>
              <h3 className={teams.subhead}>Closed rolls</h3>
              {past.map(rollCard)}
            </>
          )}
        </section>
        <section className={`panel ${teams.panel}`} aria-labelledby="flip-history">
          <PanelHead id="flip-history" title="Flip history" line="The team's last 30 coin flips." />
          {view.flips.length ? (
            <ul className={teams.list}>
              {view.flips.map((f) => (
                <li key={f.id} className={`well ${teams.wellRow}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
                  <img
                    src={sideArt[f.outcome as Side]}
                    alt={sideName[f.outcome as Side]}
                    width={28}
                    height={28}
                  />
                  <span className={teams.rowCopy}>
                    <strong>{verdict(f).head}</strong>
                    <small>
                      {verdict(f).line}
                      {f.rollId ? " · roll tie-break" : ""} · {shortTime(f.createdAt)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWell
              emblem="trophy-silver-64w"
              title="No coin flips yet"
              line="Flips the team throws show here."
            />
          )}
        </section>
      </div>
      {loadedFor !== attempt && <StatusLine>Refreshing…</StatusLine>}
    </section>
  );
}

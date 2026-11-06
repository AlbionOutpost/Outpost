"use client";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, RefreshCw, Search, Skull, Swords } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import { regions } from "@/lib/albion/region-config";
import type { CombatEvent, CombatFeed as Feed } from "@/lib/albion/combat-events";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceAge } from "@/lib/albion/source-age";
import { ItemIcon } from "./item-icon";
import { LoadoutBoard } from "./loadout-board";
import { WellSelect } from "./well-select";
import { EmptyWell } from "./empty-well";
import { Disclosure } from "./disclosure";
import { StatusLine, Unavailable } from "./status-line";
import { NextStepCards } from "./next-step-cards";
import styles from "./combat-feed.module.css";

type Player = CombatEvent["killer"];
const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
const utc = (value: string) =>
  new Date(value).toISOString().slice(0, 19).replace("T", " ") + " UTC";
const pieces = (p: Player) =>
  p.equipment.flatMap((e) => (e.itemId ? [{ slot: e.slot, itemId: e.itemId }] : []));

/** One side of a killboard, as on the landing's top kills: name, guild, IP, then the board. */
function Side({ player, victim, lead }: { player: Player; victim?: boolean; lead?: boolean }) {
  return (
    <div className={`${styles.side}${victim ? ` ${styles.victim}` : ""}`}>
      <span className={`${styles.who}${lead ? " combat-identity" : ""}`}>
        <strong title={player.name}>{player.name}</strong>
        <small>
          {player.guild || "No guild"}
          {player.alliance ? ` [${player.alliance}]` : ""}
        </small>
        <small>
          {player.itemPower ? (
            `${Math.round(player.itemPower).toLocaleString("en-US")} IP`
          ) : (
            <Unavailable label="IP unavailable" />
          )}
        </small>
      </span>
      <LoadoutBoard
        pieces={pieces(player)}
        size="mini"
        abilities={false}
        label={`${player.name} equipment`}
      />
    </div>
  );
}

/** Every recorded piece by name and quality, for the item details. */
function Gear({ player, victim }: { player: Player; victim?: boolean }) {
  return (
    <div className={styles.gear}>
      <strong className={victim ? styles.victimName : styles.killerName}>{player.name}</strong>
      <ul>
        {player.equipment.map((item) =>
          item.itemId ? (
            <li key={item.slot}>
              <span
                role="img"
                aria-label={`${item.slot}: ${equipmentName(item.itemId)}`}
                title={`${item.slot}: ${equipmentName(item.itemId)}`}
              >
                <ItemIcon id={item.itemId} quality={item.quality || 1} size={36} />
              </span>
              <span>
                <b>{equipmentName(item.itemId)}</b>
                <small>
                  {item.slot} ·{" "}
                  {item.quality ? qualities[item.quality - 1] : "quality not reported"}
                </small>
              </span>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

export function CombatFeed({ mode }: { mode: "kills" | "deaths" }) {
  const region = useOutpostRegion();
  const [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("latest"),
    [automatic, setAutomatic] = useState(false),
    [minimumFame, setMinimumFame] = useState("0");
  const [result, setResult] = useState<{ key: string; feed: Feed } | null>(null),
    [error, setError] = useState<{ key: string; message: string } | null>(null),
    [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const controller = useRef<AbortController | null>(null);
  const key = `${region}:${offset}`;
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setPending(key);
    setError(null);
    try {
      const response = await fetch(
        `/api/combat-events?${new URLSearchParams({ region, offset: String(offset) })}`,
        { signal: active.signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the combat feed.");
      if (data.region !== region || data.offset !== offset || !Array.isArray(data.events))
        throw new Error("The feed returned a different server or page. Retry your selection.");
      if (!active.signal.aborted) setResult({ key, feed: data });
    } catch (e) {
      if (!active.signal.aborted)
        setError({
          key,
          message:
            e instanceof Error ? e.message : "Could not load the combat feed. Retry shortly.",
        });
    } finally {
      if (controller.current === active) setPending(null);
    }
  }, [key, offset, region]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    if (!automatic) return;
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) void refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [automatic, refresh]);
  const feed = result?.key === key ? result.feed : null;
  const needle = query.trim().toLowerCase();
  const filtered = Boolean(query || minimumFame !== "0");
  const events = (feed?.events || [])
    .filter((event) =>
      [event.killer.name, event.killer.guild, event.victim.name, event.victim.guild].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    )
    .filter((event) => event.fame >= Number(minimumFame))
    .toSorted((a, b) =>
      sort === "fame" ? b.fame - a.fame : Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
  const loading = pending === key || (!feed && error?.key !== key);
  const failed = error?.key === key;
  const kills = mode === "kills";
  const noun = kills ? "kills" : "deaths";
  const turn = (to: number) => {
    setOffset(to);
    setOpen(new Set());
  };
  return (
    <div className={`combat-feed-page ${styles.page}`}>
      <WorkspaceHeading
        glyph="combat"
        scene="builds"
        title={kills ? "Global kill feed" : "Global death feed"}
        accent={kills ? "kill" : "death"}
        description={`The latest PvP ${noun} on ${regions[region].label}, with both loadouts as the game recorded them.`}
      >
        <MastheadTabs
          label="Combat feed"
          tabs={[
            {
              href: "/tools/kill-feed",
              label: "Kill feed",
              icon: <Swords size={16} />,
              current: kills,
            },
            {
              href: "/tools/kill-feed?view=deaths",
              label: "Death feed",
              icon: <Skull size={16} />,
              current: !kills,
            },
          ]}
        />
      </WorkspaceHeading>
      <section className={`raised ${styles.toolbar}`} aria-label="Feed filters">
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Filter this feed page by player or guild</span>
          <input
            placeholder="Filter this page by player or guild…"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Sort</span>
          <WellSelect value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="latest">Latest first</option>
            <option value="fame">Highest kill fame</option>
          </WellSelect>
        </label>
        <label className={styles.field}>
          <span>Kill fame</span>
          <WellSelect
            aria-label="Minimum kill fame"
            value={minimumFame}
            onChange={(event) => setMinimumFame(event.target.value)}
          >
            <option value="0">Any fame</option>
            <option value="10000">10,000+</option>
            <option value="100000">100,000+</option>
            <option value="1000000">1,000,000+</option>
          </WellSelect>
        </label>
        <div className={styles.actions}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={automatic}
              onChange={(e) => setAutomatic(e.target.checked)}
            />
            Update every minute
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "refreshing" : undefined}
              aria-hidden="true"
            />
            {loading ? "Updating…" : "Refresh feed"}
          </button>
        </div>
        <p className={styles.source}>
          {feed
            ? `${events.length} ${noun} shown · page ${offset / 20 + 1} · checked ${sourceAge(feed.fetchedAt).label}`
            : "From Albion Online’s published PvP events."}
        </p>
      </section>
      {failed && (
        <div className={styles.error} role="alert">
          <div>
            <p className={styles.errorTitle}>The {kills ? "kill" : "death"} feed did not load.</p>
            <p className={styles.errorLine}>
              {error.message}
              {feed ? " The last page that loaded stays below." : ""}
            </p>
          </div>
          <button
            type="button"
            className="pill-link"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={15} aria-hidden="true" /> Retry feed
          </button>
        </div>
      )}
      {!feed ? (
        <div className={styles.grid} aria-busy={loading}>
          {loading && (
            <div className={styles.loading}>
              <StatusLine>Loading the {kills ? "kill" : "death"} feed…</StatusLine>
            </div>
          )}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`raised has-scene ${styles.card} ${styles.skeleton}${loading ? ` ${styles.breathing}` : ""}`}
              data-scene={["build", "composition", "market"][i]}
              aria-hidden="true"
            >
              <div className={styles.boards}>
                <LoadoutBoard pieces={[]} size="mini" abilities={false} />
                <div className={styles.mid} />
                <LoadoutBoard pieces={[]} size="mini" abilities={false} />
              </div>
            </div>
          ))}
        </div>
      ) : !events.length ? (
        <div className={styles.empty}>
          <EmptyWell
            emblem="kill-skull"
            title={filtered ? "No events match these page filters" : `No ${noun} on this page`}
            line={
              filtered
                ? "Clear the filters, or look at another page of the feed."
                : "The game published nothing for this page yet. Refresh in a minute."
            }
            action={
              filtered || offset > 0 ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (filtered) {
                      setQuery("");
                      setMinimumFame("0");
                    } else turn(0);
                  }}
                >
                  {filtered ? "Clear filter" : "Latest events"}
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={styles.grid} aria-label={`Published ${noun}`} role="list">
          {events.map((event, i) => {
            const lead = kills ? event.killer : event.victim;
            const other = kills ? event.victim : event.killer;
            const old = Date.parse(feed.fetchedAt) - Date.parse(event.occurredAt) > 15 * 60000;
            const future = Date.parse(event.occurredAt) > Date.parse(feed.fetchedAt) + 60000;
            const isOpen = open.has(event.id);
            const age = sourceAge(event.occurredAt, Date.parse(feed.fetchedAt));
            return (
              <article
                key={event.id}
                role="listitem"
                className={`raised has-scene combat-event ${styles.card}`}
                data-scene={["build", "composition", "market"][i % 3]}
              >
                <div className={`combat-event-summary ${styles.boards}`}>
                  <Side player={lead} victim={!kills} lead />
                  <div className={styles.mid}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                    <img src="/albion/icons/fame.webp" alt="" width={24} height={24} />
                    <strong>{event.fame.toLocaleString("en-US")}</strong>
                    <small>kill fame</small>
                    {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                    <img
                      className={styles.skull}
                      src="/albion/icons/kill-skull.webp"
                      alt=""
                      width={30}
                      height={30}
                    />
                    <em>{kills ? "Killed" : "Killed by"}</em>
                    <time dateTime={event.occurredAt} title={utc(event.occurredAt)}>
                      {age.label}
                    </time>
                  </div>
                  <Side player={other} victim={kills} />
                </div>
                <div className={styles.foot}>
                  <span className={styles.footMeta}>
                    {event.participants !== null
                      ? `${event.participants} ${event.participants === 1 ? "participant" : "participants"}`
                      : "Participants not reported"}
                    {(old || future) && (
                      <span className={styles.delayed}>
                        {future ? "Source time is ahead" : "Delayed source event"}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.detailsToggle}
                    aria-expanded={isOpen}
                    aria-controls={`combat-event-${event.id}`}
                    onClick={() => {
                      const next = new Set(open);
                      if (isOpen) next.delete(event.id);
                      else next.add(event.id);
                      setOpen(next);
                    }}
                  >
                    Item details <ChevronDown size={14} aria-hidden="true" />
                  </button>
                </div>
                <div
                  id={`combat-event-${event.id}`}
                  className={`combat-event-details ${styles.details}`}
                  data-open={isOpen || undefined}
                  inert={!isOpen}
                >
                  <div>
                    <Gear player={event.killer} />
                    <Gear player={event.victim} victim />
                    <p>
                      Event #{event.id} · {utc(event.occurredAt)}. Slots the game did not report
                      stay empty.
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {feed && (offset > 0 || feed.events.length >= 20) && (
        <nav className={styles.pager} aria-label="Combat feed pages">
          <button
            type="button"
            className="pill-link is-small"
            disabled={offset === 0 || loading}
            onClick={() => turn(Math.max(0, offset - 20))}
          >
            <ArrowLeft size={14} aria-hidden="true" /> Newer {noun}
          </button>
          <span>Page {offset / 20 + 1}</span>
          <button
            type="button"
            className="pill-link is-small"
            disabled={loading || !feed || feed.events.length < 20 || offset >= 200}
            onClick={() => turn(offset + 20)}
          >
            Older {noun} <ArrowRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
      <div className={styles.about}>
        <Disclosure summary="About this feed">
          <p className={styles.aboutText}>
            Kills and deaths are the same fights seen from each side. The game publishes them with a
            delay, so a refresh can show nothing new. Gear and IP are what the game recorded for the
            fight; a slot it did not report stays empty.
          </p>
        </Disclosure>
      </div>
      <NextStepCards
        id="combat-next"
        title={
          <>
            Gear up for the next <em>fight</em>
          </>
        }
        line="Find a PvP loadout, plan your party, or price the set before you risk it."
        link={{ href: "/builds", label: "All builds" }}
        cards={[
          {
            href: "/builds/activities",
            emblem: "strip-builds",
            title: "Builds by activity",
            line: "Loadouts players run for small scale, ganking, Hellgates and more.",
            scene: "build",
          },
          {
            href: "/compositions",
            emblem: "strip-comps",
            title: "Comps",
            line: "Plan the party: roles, loadouts and swaps for every slot.",
            scene: "composition",
          },
          {
            href: "/tools/market",
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Prices in every city, so you know what a set costs to replace.",
            scene: "market",
          },
        ]}
      />
    </div>
  );
}

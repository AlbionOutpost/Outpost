"use client";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, RefreshCw, Skull, Swords } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import { regions } from "@/lib/albion/region-config";
import type { GearValue } from "@/lib/albion/kill-value";
import type { CombatEvent, CombatFeed } from "@/lib/albion/combat-events";
/** The API prices each victim's worn gear in the same response (see pricedCombatEvents). */
type Feed = Omit<CombatFeed, "events"> & {
  events: (CombatEvent & { gearValue?: GearValue })[];
};
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceAge } from "@/lib/albion/source-age";
import { ItemIcon } from "./item-icon";
import { KillCard } from "./kill-card";
import { LoadoutBoard } from "./loadout-board";
import { WellSelect } from "./well-select";
import { EmptyWell } from "./empty-well";
import { Disclosure } from "./disclosure";
import { StatusLine } from "./status-line";
import styles from "./combat-feed.module.css";
import { SearchInput } from "./field";

type Player = CombatEvent["killer"];
const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
const utc = (value: string) =>
  new Date(value).toISOString().slice(0, 19).replace("T", " ") + " UTC";
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
        compact
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
          <span className="sr-only">Filter this feed page by player or guild</span>
          <SearchInput
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
            ? `${events.length} ${noun} shown · page ${offset / 20 + 1} · newest ${feed.newestAt ? sourceAge(feed.newestAt).label : "unavailable"} · checked ${sourceAge(feed.fetchedAt).label}`
            : "From Albion Online’s published PvP events."}
        </p>
      </section>
      {feed && feed.freshness !== "live" && feed.newestAt && (
        // Old fights are never shown as the latest: say how far behind the answer is.
        <div className={`well ${styles.error} combat-feed-freshness`}>
          <StatusLine tone="stale">
            {feed.freshness === "snapshot"
              ? `Albion’s server sent an old copy of the feed: its newest ${kills ? "kill" : "death"} is from ${sourceAge(feed.newestAt).label}, but Outpost saw fights from ${sourceAge(feed.latestSeenAt).label}. These are not the latest fights; refresh to ask again.`
              : `Albion’s feed is running behind: the newest published ${kills ? "kill" : "death"} is from ${sourceAge(feed.newestAt).label}. Newer fights appear once the game publishes them.`}
          </StatusLine>
          <button
            type="button"
            className="pill-link is-small"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden="true" /> Ask again
          </button>
        </div>
      )}
      {failed && (
        // Said once, on its own surface, with the way back beside it
        <div className={`raised ${styles.error}`}>
          <StatusLine tone="error">
            {error.message}
            {feed ? " The last page that loaded stays below." : ""}
          </StatusLine>
          <button
            type="button"
            className="pill-link is-small"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden="true" /> Retry feed
          </button>
        </div>
      )}
      {!feed ? (
        loading ? (
          <div className={`kill-grid ${styles.grid}`} aria-busy="true">
            <div className={styles.loading}>
              <StatusLine>Loading the {kills ? "kill" : "death"} feed…</StatusLine>
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`raised has-scene kill-card ${styles.card} ${styles.skeleton}`}
                data-scene={["build", "composition", "market"][i]}
                aria-hidden="true"
              >
                <div className="kill-boards">
                  <LoadoutBoard pieces={[]} size="mini" abilities={false} />
                  <div className="kill-mid" />
                  <LoadoutBoard pieces={[]} size="mini" abilities={false} />
                </div>
              </div>
            ))}
          </div>
        ) : null
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
        <section className={`kill-grid ${styles.grid}`} aria-label={`Published ${noun}`}>
          {events.map((event, i) => {
            const at = Date.parse(feed.fetchedAt);
            // The game publishes most fights minutes late; flag only the ones an hour behind.
            const old = at - Date.parse(event.occurredAt) > 60 * 60000;
            const future = Date.parse(event.occurredAt) > at + 60000;
            const isOpen = open.has(event.id);
            return (
              <KillCard
                key={event.id}
                event={event}
                at={at}
                gearValue={event.gearValue ?? null}
                scene={["build", "composition", "market"][i % 3]}
                className={`combat-event ${styles.card}`}
              >
                <div className={styles.foot}>
                  <span className={styles.footMeta}>
                    <span>
                      {event.participants !== null
                        ? `${event.participants} ${event.participants === 1 ? "participant" : "participants"}`
                        : "Participants not reported"}
                    </span>
                    {(old || future) && (
                      <span className={styles.delayed} title={utc(event.occurredAt)}>
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
              </KillCard>
            );
          })}
        </section>
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
    </div>
  );
}

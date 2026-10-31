"use client";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Swords,
} from "lucide-react";
import { useAtlasRegion } from "./region-context";
import { regions } from "@/lib/albion/region-config";
import type { CombatEvent, CombatFeed as Feed } from "@/lib/albion/combat-events";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
function timestamp(value: string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ") + " UTC";
}
function Gear({ player }: { player: CombatEvent["killer"] }) {
  return (
    <div className="combat-player-gear">
      <div>
        <strong>{player.name}</strong>
        <span>{player.guild || "No guild reported"}</span>
      </div>
      <div className="combat-gear-strip">
        {player.equipment.map((item) => (
          <span
            key={item.slot}
            role="img"
            title={
              item.itemId
                ? `${item.slot}: ${equipmentName(item.itemId)} · ${item.quality ? ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][item.quality - 1] : "Quality not reported"}`
                : `${item.slot}: empty or not reported`
            }
            aria-label={
              item.itemId
                ? `${item.slot}: ${equipmentName(item.itemId)}`
                : `${item.slot}: not reported`
            }
          >
            {item.itemId ? (
              <ItemIcon id={item.itemId} quality={item.quality || 1} size={42} />
            ) : (
              <Shield size={19} aria-hidden="true" />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
export function CombatFeed({ mode }: { mode: "kills" | "deaths" }) {
  const region = useAtlasRegion();
  const [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("latest"),
    [automatic, setAutomatic] = useState(false),
    [minimumFame, setMinimumFame] = useState("0");
  const [result, setResult] = useState<{ key: string; feed: Feed } | null>(null),
    [error, setError] = useState<{ key: string; message: string } | null>(null),
    [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
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
  return (
    <div className="combat-feed-page support-combat-feed">
      <WorkspaceHeading
        glyph="combat"
        scene="builds"
        title={mode === "kills" ? "Global kill feed" : "Global death feed"}
        description={`Recent published PvP events on ${regions[region].label}. Inspect the players and the equipment recorded in each fight.`}
      >
        <MastheadTabs
          label="Combat feed"
          tabs={[
            {
              href: "/tools/kill-feed",
              label: "Kill feed",
              icon: <Swords size={16} />,
              current: mode === "kills",
            },
            {
              href: "/tools/kill-feed?view=deaths",
              label: "Death feed",
              icon: <Skull size={16} />,
              current: mode === "deaths",
            },
          ]}
        />
      </WorkspaceHeading>
      <div className="raised combat-toolbar">
        <label className="combat-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Filter this feed page by player or guild</span>
          <input
            placeholder="Filter this page by player or guild…"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Sort this page
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="latest">Latest event</option>
            <option value="fame">Highest kill fame</option>
          </select>
        </label>
        <label>
          Minimum fame
          <select
            aria-label="Minimum kill fame"
            value={minimumFame}
            onChange={(event) => setMinimumFame(event.target.value)}
          >
            <option value="0">Any fame</option>
            <option value="10000">10,000+</option>
            <option value="100000">100,000+</option>
            <option value="1000000">1,000,000+</option>
          </select>
        </label>
        <label className="combat-auto">
          <input
            type="checkbox"
            checked={automatic}
            onChange={(e) => setAutomatic(e.target.checked)}
          />{" "}
          Update every minute
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "refreshing" : undefined} />
          {loading ? "Updating…" : "Refresh feed"}
        </button>
      </div>
      <div className="combat-source">
        <span>
          {feed
            ? `${events.length} events shown · page ${offset / 20 + 1}`
            : "Latest published events"}
        </span>
        <span>{feed ? `Checked ${timestamp(feed.fetchedAt)}` : "Albion Online Game Info"}</span>
      </div>
      {error?.key === key && (
        <div className="task-state combat-error" role="alert">
          <h2>Combat feed unavailable</h2>
          <p>{error.message}</p>
          <button className="button secondary" onClick={() => void refresh()} disabled={loading}>
            Retry feed
          </button>
          {feed && <p>The last loaded page remains visible below.</p>}
        </div>
      )}
      {!feed && loading ? (
        <div className="combat-skeleton" role="status" aria-label="Loading combat events">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : feed && !events.length ? (
        <div className="task-state">
          <h2>
            {query || minimumFame !== "0"
              ? "No events match these page filters"
              : "No combat events returned"}
          </h2>
          <p>
            {query || minimumFame !== "0"
              ? "Clear the page filters or browse another page of published events."
              : "The source returned no events for this page. Try the latest page or refresh later."}
          </p>
          <button
            className="button secondary"
            onClick={() => {
              if (query || minimumFame !== "0") {
                setQuery("");
                setMinimumFame("0");
              } else setOffset(0);
            }}
          >
            {query || minimumFame !== "0" ? "Clear filter" : "Latest events"}
          </button>
        </div>
      ) : (
        <div className="raised combat-event-list" aria-label="Published combat events">
          {events.map((event) => {
            const highlighted = mode === "kills" ? event.killer : event.victim;
            const other = mode === "kills" ? event.victim : event.killer;
            const weapon = highlighted.equipment.find((item) => item.slot === "Main hand");
            const old = Date.parse(feed!.fetchedAt) - Date.parse(event.occurredAt) > 15 * 60000;
            const future = Date.parse(event.occurredAt) > Date.parse(feed!.fetchedAt) + 60000;
            return (
              <article
                className={`combat-event${open === event.id ? " is-open" : ""}`}
                key={event.id}
              >
                <button
                  className="combat-event-summary"
                  aria-expanded={open === event.id}
                  aria-controls={`combat-event-${event.id}`}
                  onClick={() => setOpen(open === event.id ? null : event.id)}
                >
                  <span className="combat-weapon">
                    {weapon?.itemId ? (
                      <ItemIcon id={weapon.itemId} quality={weapon.quality || 1} size={56} />
                    ) : (
                      <Swords aria-hidden="true" />
                    )}
                  </span>
                  <span className="combat-identity">
                    <strong>{highlighted.name}</strong>
                    <small>{highlighted.guild || "No guild reported"}</small>
                  </span>
                  <span className="combat-opponent">
                    <span>{mode === "kills" ? "defeated" : "defeated by"}</span>
                    <strong>{other.name}</strong>
                    <small>{other.guild || "No guild reported"}</small>
                  </span>
                  <span className="combat-fame">
                    <strong>{event.fame.toLocaleString()}</strong>
                    <small>kill fame</small>
                  </span>
                  <span className="combat-when">
                    <time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time>
                    {(old || future) && (
                      <small>{future ? "Source time is ahead" : "Delayed source event"}</small>
                    )}
                  </span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
                {open === event.id && (
                  <div id={`combat-event-${event.id}`} className="combat-event-details">
                    <Gear player={event.killer} />
                    <ArrowRight aria-hidden="true" />
                    <Gear player={event.victim} />
                    <p>
                      Event #{event.id}
                      {event.participants !== null
                        ? ` · ${event.participants} reported participants`
                        : ""}
                      . Equipment reflects the event record; absent items and unreported quality
                      stay unknown.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <nav className="combat-pagination" aria-label="Combat feed pages">
        <button
          className="button secondary"
          disabled={offset === 0 || loading}
          onClick={() => {
            setOffset(Math.max(0, offset - 20));
            setOpen(null);
          }}
        >
          <ChevronLeft size={15} /> Newer events
        </button>
        <span>Page {offset / 20 + 1} of at most 11</span>
        <button
          className="button secondary"
          disabled={loading || !feed || feed.events.length < 20 || offset >= 200}
          onClick={() => {
            setOffset(offset + 20);
            setOpen(null);
          }}
        >
          Older events <ChevronRight size={15} />
        </button>
      </nav>
      <p className="combat-footnote">
        Kills and deaths are two views of the same published PvP events. Source publication can be
        delayed; refreshing does not imply a newer fight. Item power and equipment are reported by
        the game service, not simulated combat statistics.
      </p>
    </div>
  );
}

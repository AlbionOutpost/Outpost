"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import { LoadoutBoard } from "@/components/loadout-board";
import { useAtlasRegion } from "@/components/region-context";
import { sourceAge } from "@/lib/albion/source-age";
import type { TopKill, TopKillsFeed } from "@/lib/albion/combat-events";
import { compact } from "./silver";
import { useLoad } from "./use-load";

type Kill = TopKill & { gearValue: { total: number; priced: number; missing: number } | null };
type Feed = Omit<TopKillsFeed, "events"> & { events: Kill[] };
type Player = TopKill["killer"];

const ip = (p: Player) => (p.itemPower ? Math.round(p.itemPower).toLocaleString("en-US") : "—");
const fame = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : `${Math.round(n / 1000)}k`;
const pieces = (p: Player) =>
  p.equipment.flatMap((e) => (e.itemId ? [{ slot: e.slot, itemId: e.itemId }] : []));
const trophies = ["gold", "silver", "bronze"] as const;

function Side({ p, victim }: { p: Player; victim?: boolean }) {
  return (
    <div className={`kill-side${victim ? " is-victim" : ""}`}>
      <div className="kill-who">
        <strong>{p.name}</strong>
        <small>
          {p.guild || "No guild"}
          {p.alliance ? ` [${p.alliance}]` : ""}
        </small>
        <small>{ip(p)} IP</small>
      </div>
      <LoadoutBoard
        pieces={pieces(p)}
        size="mini"
        abilities={false}
        label={`${p.name} equipment`}
      />
    </div>
  );
}

/**
 * The three highest-fame kills in the source's ranking as killboards: both loadouts, kill fame,
 * an estimated gear value, what the victim carried and, on request, every participant with
 * their kit. The section heading says how old the kills are; nothing is estimated silently.
 */
export function TopKills({ suffix, serverName }: { suffix: string; serverName: string }) {
  const region = useAtlasRegion();
  const [open, setOpen] = useState<number | null>(null);
  const data = useLoad(region, async (signal) => {
    const r = await fetch(`/api/combat-events/top?region=${region}`, { signal });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Kill ranking unavailable.");
    return { feed: body as Feed, at: Date.now() };
  });
  const feed = data?.value?.feed;
  // "today" only when every featured kill really is from the past day; the source's ranking
  // window lags at times.
  const fresh =
    !!feed?.events.length &&
    feed.events.every((e) => Date.parse(feed.fetchedAt) - Date.parse(e.occurredAt) < 86_400_000);
  return (
    <section className="landing-wrap landing-kills" aria-labelledby="home-kills-title">
      <div className="landing-section-heading">
        <h2 id="home-kills-title">
          Top kills <em>{fresh ? "today" : "this week"}</em>
        </h2>
        <p>
          The three highest-fame kills on {serverName}{" "}
          {fresh ? "in the past 24 hours" : "in the game’s current ranking"}.
        </p>
        <Link className="text-link" href={`/tools/kill-feed${suffix}`}>
          Open the kill feed <ArrowRight size={15} />
        </Link>
      </div>
      {!data?.value ? (
        <p className="landing-preview-status" role="status">
          {data?.error ?? "Loading the kill ranking…"}
        </p>
      ) : (
        <Kills feed={data.value.feed} at={data.value.at} open={open} setOpen={setOpen} />
      )}
    </section>
  );
}

function Kills({
  feed,
  at,
  open,
  setOpen,
}: {
  feed: Feed;
  at: number;
  open: number | null;
  setOpen: (id: number | null) => void;
}) {
  return (
    <div className="kill-grid">
      {feed.events.slice(0, 3).map((ev, rank) => {
        const age = sourceAge(ev.occurredAt, at);
        const isOpen = open === ev.id;
        const gear = ev.gearValue;
        return (
          <article key={ev.id} className="kill-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img
              className="kill-trophy"
              src={`/albion/icons/trophy-${trophies[rank]}.webp`}
              alt={`#${rank + 1}`}
              width={34}
              height={34}
            />
            <div className="kill-boards">
              <Side p={ev.killer} />
              <div className="kill-mid">
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img src="/albion/icons/fame.webp" alt="Kill fame" width={24} height={24} />
                <strong>{fame(ev.fame)}</strong>
                <span
                  className="kill-killed"
                  title={`Killed ${age.label} · ${ev.occurredAt.replace("T", " ").slice(0, 16)} UTC`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                  <img src="/albion/icons/kill-skull.webp" alt="" width={30} height={30} />
                  <em>Killed</em>
                  <time className="sr-only" dateTime={ev.occurredAt}>
                    {age.label}
                  </time>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img
                  src="/albion/icons/silver.webp"
                  alt="Estimated gear value"
                  width={30}
                  height={30}
                />
                <strong
                  className="is-silver"
                  title={
                    gear
                      ? `Estimated: ${gear.priced} worn pieces at their cheapest royal-city sell order${gear.missing ? `; ${gear.missing} without a listing` : ""}`
                      : "No listings for the worn gear right now"
                  }
                >
                  {gear ? `${compact(gear.total)}${gear.missing ? "+" : ""}` : "—"}
                </strong>
              </div>
              <Side p={ev.victim} victim />
            </div>
            <div className="kill-loot">
              <span className="kill-loot-label">Victim’s inventory</span>
              {ev.inventory.length ? (
                <ul aria-label="Items the victim carried">
                  {ev.inventory.slice(0, 18).map((it, i) => (
                    <li key={`${it.itemId}-${i}`} title={it.itemId}>
                      <span className="kill-loot-blank" aria-hidden="true">
                        ?
                      </span>
                      <ItemIcon id={it.itemId} size={34} />
                      {it.count > 1 && <b>{it.count}</b>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="kill-loot-empty">Nothing carried</p>
              )}
            </div>
            <button
              type="button"
              className="kill-toggle"
              aria-expanded={isOpen}
              disabled={!ev.crew.length}
              onClick={() => setOpen(isOpen ? null : ev.id)}
            >
              {ev.crew.length
                ? `${isOpen ? "Hide" : "Show"} ${ev.crew.length} participant${ev.crew.length === 1 ? "" : "s"}`
                : "No participants recorded"}
              {ev.crew.length ? <span aria-hidden="true">{isOpen ? "▴" : "▾"}</span> : null}
            </button>
            {isOpen && (
              <ol className="kill-people" aria-label="Participants">
                {ev.crew
                  .toSorted((a, b) => b.damage + b.healing - (a.damage + a.healing))
                  .map((p) => (
                    <li key={p.name}>
                      <span className="kill-person">
                        <strong>{p.name}</strong>
                        <small>
                          {p.guild || "No guild"} · {p.itemPower ? Math.round(p.itemPower) : "—"} IP
                        </small>
                        <small>
                          {p.damage ? `${p.damage.toLocaleString("en-US")} dmg` : ""}
                          {p.damage && p.healing ? " · " : ""}
                          {p.healing ? `${p.healing.toLocaleString("en-US")} healing` : ""}
                        </small>
                      </span>
                      <span className="kill-kit">
                        {p.equipment.slice(0, 6).map((e) => (
                          <ItemIcon key={e.slot} id={e.itemId} size={28} />
                        ))}
                      </span>
                    </li>
                  ))}
              </ol>
            )}
          </article>
        );
      })}
    </div>
  );
}

"use client";
import { useState } from "react";
import type React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
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
/** The game reports some kills without the gear worn (hidden or not captured); the board
 * shows the three highest-fame kills where both sides' gear was recorded. */
const geared = (p: Player) => p.equipment.some((e) => e.itemId);
const shown = (events: Kill[]) =>
  events.filter((e) => geared(e.killer) && geared(e.victim)).slice(0, 3);

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
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const data = useLoad(region, async (signal) => {
    const r = await fetch(`/api/combat-events/top?region=${region}`, { signal });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Kill ranking unavailable.");
    return { feed: body as Feed, at: Date.now() };
  });
  return (
    <section className="landing-wrap landing-kills" aria-labelledby="home-kills-title">
      <div className="section-heading landing-section-heading">
        <h2 id="home-kills-title">
          Top kills <em>this week</em>
        </h2>
        <p>
          The three most valuable kills on {serverName} in the last seven days, by the estimated
          silver value of the victim&apos;s gear.
        </p>
        <Link className="pill-link" href={`/tools/kill-feed${suffix}`}>
          Open the kill feed <ArrowRight size={15} />
        </Link>
      </div>
      {!data?.value ? (
        <p className="landing-preview-status" role="status">
          {data?.error ?? "Loading the kill ranking…"}
        </p>
      ) : !shown(data.value.feed.events).length ? (
        <p className="landing-preview-status" role="status">
          No ranked kill has both loadouts recorded right now.
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
  open: Set<number>;
  setOpen: (ids: Set<number>) => void;
}) {
  return (
    <div className="kill-grid">
      {shown(feed.events).map((ev, rank) => {
        const age = sourceAge(ev.occurredAt, at);
        const isOpen = open.has(ev.id);
        const gear = ev.gearValue;
        return (
          <article key={ev.id} className="raised has-scene kill-card" data-scene="composition">
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
                  <time className="kill-ago" dateTime={ev.occurredAt}>
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
                    <li key={`${it.itemId}-${i}`} title={equipmentName(it.itemId)}>
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
              aria-controls={`kill-people-${ev.id}`}
              disabled={!ev.crew.length}
              onClick={() => {
                const next = new Set(open);
                if (isOpen) next.delete(ev.id);
                else next.add(ev.id);
                setOpen(next);
              }}
            >
              {ev.crew.length
                ? `${isOpen ? "Hide" : "Show"} ${ev.crew.length} participant${ev.crew.length === 1 ? "" : "s"}`
                : "No participants recorded"}
              {ev.crew.length ? <ChevronDown size={14} aria-hidden="true" /> : null}
            </button>
            {ev.crew.length ? (
              // Always in the tree so the height can animate; closed, it is inert and hidden.
              <div
                className="kill-people-wrap"
                id={`kill-people-${ev.id}`}
                data-open={isOpen || undefined}
                inert={!isOpen}
              >
                <ol className="kill-people" aria-label="Participants">
                  {ev.crew
                    .toSorted((a, b) => b.damage + b.healing - (a.damage + a.healing))
                    .map((p, i) => (
                      <li key={p.name} style={{ "--i": i } as React.CSSProperties}>
                        <span className="kill-person">
                          <strong>{p.name}</strong>
                          <small>
                            {p.guild || "No guild"} · {p.itemPower ? Math.round(p.itemPower) : "—"}{" "}
                            IP
                          </small>
                          <small>
                            {p.damage ? `${p.damage.toLocaleString("en-US")} dmg` : ""}
                            {p.damage && p.healing ? " · " : ""}
                            {p.healing ? `${p.healing.toLocaleString("en-US")} healing` : ""}
                          </small>
                        </span>
                        {p.equipment.some((e) => e.itemId) ? (
                          <span className="kill-kit">
                            {p.equipment
                              .filter((e) => e.itemId)
                              .slice(0, 6)
                              .map((e) => (
                                <ItemIcon key={e.slot} id={e.itemId} size={28} />
                              ))}
                          </span>
                        ) : (
                          <span className="kill-kit-empty">No gear recorded</span>
                        )}
                      </li>
                    ))}
                </ol>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

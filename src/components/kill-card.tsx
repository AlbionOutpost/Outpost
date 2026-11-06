"use client";
import "./kill-card.css";
import type React from "react";
import { ChevronDown } from "lucide-react";
import { ItemIcon } from "@/components/item-icon";
import { LoadoutBoard } from "@/components/loadout-board";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceAge } from "@/lib/albion/source-age";
import { compact } from "@/components/silver";
import { Unavailable } from "@/components/status-line";
import type { CombatEvent, TopKill } from "@/lib/albion/combat-events";
import type { GearValue } from "@/lib/albion/kill-value";

type Player = CombatEvent["killer"];
/** A fight as the killboard draws it. The ranked kills also carry what the victim had on them
 * and who took part; the plain feed does not, and the card leaves those parts out. */
export type KillCardEvent = CombatEvent & {
  inventory?: TopKill["inventory"];
  crew?: TopKill["crew"];
};

/** Item power as recorded, or the muted "— IP unavailable" when the game left it out. */
const ip = (power: number | null) =>
  power ? (
    `${Math.round(power).toLocaleString("en-US")} IP`
  ) : (
    <Unavailable label="IP unavailable" />
  );
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
        <small>{ip(p.itemPower)}</small>
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
 * One fight as a killboard: killer and victim with their loadouts, kill fame, when it happened
 * and the estimated value of the victim's gear; on ranked kills also the victim's inventory and,
 * on request, every participant with their kit. `children` adds a foot (the feed's details).
 */
export function KillCard({
  event: ev,
  at,
  gearValue: gear,
  rank,
  open = false,
  onToggle,
  scene = "composition",
  className = "",
  children,
}: {
  event: KillCardEvent;
  /** When the source answered, for "12 min ago". */
  at: number;
  /** Undefined while the gear is being priced; null when no worn piece has a listing. */
  gearValue: GearValue | undefined;
  /** 0–2 shows the gold, silver or bronze trophy. */
  rank?: number;
  open?: boolean;
  onToggle?: () => void;
  scene?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const age = sourceAge(ev.occurredAt, at);
  const crew = ev.crew;
  return (
    <article
      className={`raised has-scene kill-card${className ? ` ${className}` : ""}`}
      data-scene={scene}
    >
      {rank !== undefined && (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
        <img
          className="kill-trophy"
          src={`/albion/icons/trophy-${trophies[rank]}.webp`}
          alt={`#${rank + 1}`}
          width={34}
          height={34}
        />
      )}
      <div className="kill-boards">
        <Side p={ev.killer} />
        <div className="kill-mid">
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img src="/albion/icons/fame.webp" alt="Kill fame" width={24} height={24} />
          <strong>{fame(ev.fame)}</strong>
          <span className="kill-killed">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img src="/albion/icons/kill-skull.webp" alt="" width={30} height={30} />
            <em>Killed</em>
            <time className="kill-ago" dateTime={ev.occurredAt}>
              {age.label}
            </time>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img src="/albion/icons/silver.webp" alt="Estimated gear value" width={30} height={30} />
          <strong
            className="is-silver"
            title={
              gear === undefined
                ? "Pricing the worn gear"
                : gear
                  ? `Estimated: ${gear.priced} worn pieces at their cheapest royal-city sell order${gear.missing ? `; ${gear.missing} without a listing` : ""}`
                  : "No listings for the worn gear right now"
            }
          >
            {gear === undefined
              ? "…"
              : gear
                ? `${compact(gear.total)}${gear.missing ? "+" : ""}`
                : "—"}
          </strong>
        </div>
        <Side p={ev.victim} victim />
      </div>
      {ev.inventory && (
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
      )}
      {crew && (
        <button
          type="button"
          className="kill-toggle"
          aria-expanded={open}
          aria-controls={`kill-people-${ev.id}`}
          disabled={!crew.length}
          onClick={onToggle}
        >
          {crew.length
            ? `${open ? "Hide" : "Show"} ${crew.length} participant${crew.length === 1 ? "" : "s"}`
            : "No participants recorded"}
          {crew.length ? <ChevronDown size={14} aria-hidden="true" /> : null}
        </button>
      )}
      {crew?.length ? (
        // Always in the tree so the height can animate; closed, it is inert and hidden.
        <div
          className="kill-people-wrap"
          id={`kill-people-${ev.id}`}
          data-open={open || undefined}
          inert={!open}
        >
          <ol className="kill-people" aria-label="Participants">
            {crew
              .toSorted((a, b) => b.damage + b.healing - (a.damage + a.healing))
              .map((p, i) => (
                <li key={p.name} style={{ "--i": i } as React.CSSProperties}>
                  <span className="kill-person">
                    <strong>{p.name}</strong>
                    <small>
                      {p.guild || "No guild"} · {ip(p.itemPower)}
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
      {children}
    </article>
  );
}

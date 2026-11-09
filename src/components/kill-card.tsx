"use client";
import "./kill-card.css";
import type React from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ItemIcon } from "@/components/item-icon";
import { LoadoutBoard } from "@/components/loadout-board";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceAge } from "@/lib/albion/source-age";
import { compact } from "@/components/silver";
import { variantSrcSet } from "@/lib/image-variants";
import { Unavailable } from "@/components/status-line";
import type { CombatEvent, TopKill } from "@/lib/albion/combat-events";
import type { GearValue } from "@/lib/albion/kill-value";

type Player = CombatEvent["killer"];
/** A fight as the killboard draws it. Kills from the collector and the live feed carry what the
 * victim had on them and who took part; a card leaves out whichever part an event lacks. */
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
const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
/** UTC to the second, for the exact time behind "12 min ago". */
export const utc = (value: string) =>
  new Date(value).toISOString().slice(0, 19).replace("T", " ") + " UTC";

/** Every recorded piece by name and quality, for the item details. */
function Gear({ player, victim }: { player: Player; victim?: boolean }) {
  return (
    <div className="kill-gear">
      <strong className={victim ? "is-victim" : undefined}>{player.name}</strong>
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

/** A disclosure that opens by height inside its own card; closed, it is inert and hidden. */
function Drawer({ id, open, children }: { id: string; open: boolean; children: React.ReactNode }) {
  return (
    <div className="kill-drawer" id={id} data-open={open || undefined} inert={!open}>
      {children}
    </div>
  );
}

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
 * and the estimated value of the victim's gear, then what the victim carried and, on request,
 * every participant with their kit. The landing's top kills add a trophy; the kill feed adds the
 * named item details and a note such as "Delayed source event". One card for both.
 */
export function KillCard({
  event: ev,
  at,
  gearValue: gear,
  rank,
  scene = "composition",
  className = "",
  details = false,
  note,
}: {
  event: KillCardEvent;
  /** When the source answered, for "12 min ago". */
  at: number;
  /** Undefined while the gear is being priced; null when no worn piece has a listing. */
  gearValue: GearValue | undefined;
  /** 0–2 shows the gold, silver or bronze trophy. */
  rank?: number;
  scene?: string;
  className?: string;
  /** Adds an "Item details" disclosure naming every recorded piece and the exact time. */
  details?: boolean;
  /** One short line under the card, e.g. a source-delay note. */
  note?: React.ReactNode;
}) {
  const [open, setOpen] = useState<"people" | "items" | null>(null);
  const toggle = (part: "people" | "items") => setOpen(open === part ? null : part);
  const age = sourceAge(ev.occurredAt, at);
  const crew = ev.crew;
  return (
    <article className={`raised kill-card${className ? ` ${className}` : ""}`} data-scene={scene}>
      {rank !== undefined && (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
        <img
          className="kill-trophy"
          src={`/albion/icons/trophy-${trophies[rank]}.webp`}
          srcSet={variantSrcSet(`/albion/icons/trophy-${trophies[rank]}.webp`)}
          sizes="34px"
          alt={`#${rank + 1}`}
          width={34}
          height={34}
        />
      )}
      <div className="kill-boards">
        <Side p={ev.killer} />
        <div className="kill-mid">
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img
            src="/albion/icons/fame.webp"
            srcSet={variantSrcSet("/albion/icons/fame.webp")}
            sizes="24px"
            alt="Kill fame"
            width={24}
            height={24}
          />
          <strong>{fame(ev.fame)}</strong>
          <span className="kill-killed">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img
              src="/albion/icons/kill-skull.webp"
              srcSet={variantSrcSet("/albion/icons/kill-skull.webp")}
              sizes="30px"
              alt=""
              width={30}
              height={30}
            />
            <em>Killed</em>
            <time className="kill-ago" dateTime={ev.occurredAt} title={utc(ev.occurredAt)}>
              {age.label}
            </time>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img
            src="/albion/icons/silver.webp"
            srcSet={variantSrcSet("/albion/icons/silver.webp")}
            sizes="30px"
            alt="Estimated gear value"
            width={30}
            height={30}
          />
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
      {(crew || details) && (
        <div className="kill-actions">
          {crew && (
            <button
              type="button"
              className="kill-toggle"
              aria-expanded={open === "people"}
              aria-controls={`kill-people-${ev.id}`}
              disabled={!crew.length}
              onClick={() => toggle("people")}
            >
              {crew.length
                ? `${open === "people" ? "Hide" : "Show"} ${crew.length} participant${crew.length === 1 ? "" : "s"}`
                : "No participants recorded"}
              {crew.length ? <ChevronDown size={14} aria-hidden="true" /> : null}
            </button>
          )}
          {details && (
            <button
              type="button"
              className="kill-toggle"
              aria-expanded={open === "items"}
              aria-controls={`kill-items-${ev.id}`}
              onClick={() => toggle("items")}
            >
              Item details <ChevronDown size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {crew?.length ? (
        <Drawer id={`kill-people-${ev.id}`} open={open === "people"}>
          <ol className="kill-people" aria-label="Participants">
            {[...crew]
              .sort((a, b) => b.damage + b.healing - (a.damage + a.healing))
              .map((p, i) => (
                <li key={`${p.name}-${i}`} style={{ "--i": i } as React.CSSProperties}>
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
        </Drawer>
      ) : null}
      {details && (
        <Drawer id={`kill-items-${ev.id}`} open={open === "items"}>
          <div className="kill-items combat-event-details">
            <Gear player={ev.killer} />
            <Gear player={ev.victim} victim />
            <p>
              Event #{ev.id} · {utc(ev.occurredAt)}. Slots the game did not report stay empty.
            </p>
          </div>
        </Drawer>
      )}
      {note && <p className="kill-note">{note}</p>}
    </article>
  );
}

/** A killboard waiting for its fight: the same frame, empty boards and wells, no names. */
export function KillCardSkeleton({ scene = "composition" }: { scene?: string }) {
  return (
    <div className="raised kill-card is-skeleton" data-scene={scene} aria-hidden="true">
      <div className="kill-boards">
        <LoadoutBoard pieces={[]} size="mini" abilities={false} />
        <div className="kill-mid" />
        <LoadoutBoard pieces={[]} size="mini" abilities={false} />
      </div>
      <div className="kill-loot">
        <span className="kill-loot-label">Victim’s inventory</span>
        <p className="kill-loot-empty" />
      </div>
      <div className="kill-actions">
        <span className="kill-toggle" />
      </div>
    </div>
  );
}

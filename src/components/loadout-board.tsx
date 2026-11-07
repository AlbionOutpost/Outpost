import "@/app/loadout-board.css";
import { ItemIcon } from "@/components/item-icon";
import { SpellIcon } from "@/components/spell-icon";
import type { BoardSlot } from "@/components/loadout-glyphs";
import { offHandShadow } from "@/lib/albion/two-handed";

/** The owner's slot marks (public/albion/slots): bag, cape, potion, food and mount, plus the
 * figure behind the board. Head, chest, boots and the hands stay as empty wells, as in the game. */
const slotMarks: Partial<Record<BoardSlot, string>> = {
  Bag: "/albion/slots/bag.svg",
  Cape: "/albion/slots/cape.svg",
  Potion: "/albion/slots/potion.svg",
  Food: "/albion/slots/food.svg",
  Mount: "/albion/slots/mount.svg",
};

export type BoardPiece = {
  slot: string;
  itemId: string;
  skills?: string[];
  /** The piece's name, for the slot's label and tooltip; the item id is used without it. */
  name?: string;
  /** The first recorded swap, shown as a small badge on the piece. */
  swap?: string;
};

/** The game's inventory arrangement: three columns, mount beneath the middle one. */
const columns: BoardSlot[][] = [
  ["Bag", "Main hand", "Potion"],
  ["Helmet", "Chest", "Boots", "Mount"],
  ["Cape", "Off hand", "Food"],
];

/**
 * A loadout on the game's own board: silhouette behind, every slot in its usual place, the
 * recorded pieces as official renders and their recorded active abilities beneath them.
 * Slots nothing was recorded for show the slot glyph instead of a guess.
 */
export function LoadoutBoard({
  pieces,
  spellNames = {},
  size = "card",
  abilities = true,
  choices = false,
  label = "Equipment",
  selectedSlot,
  onSelectSlot,
  flaggedSlot,
  opensPicker,
}: {
  pieces: BoardPiece[];
  spellNames?: Record<string, string>;
  size?: "hero" | "card" | "mini";
  abilities?: boolean;
  /** Show only what the player chose, as the game does: Q and W plus the passive on the
   * weapon (E is fixed per weapon), the active plus the passive on armor. */
  choices?: boolean;
  label?: string;
  /** Editing: every slot becomes a button that selects it (the build editor). */
  selectedSlot?: string;
  onSelectSlot?: (slot: string) => void;
  /** A slot that needs attention, such as a missing main hand on save. */
  flaggedSlot?: string;
  /** Editing: slots whose button opens the item picker rather than selecting the slot. */
  opensPicker?: (slot: string) => boolean;
}) {
  const interactive = !!onSelectSlot;
  const bySlot = new Map(pieces.map((p) => [p.slot, p]));
  const icon = size === "hero" ? 72 : size === "card" ? 56 : 40;
  // A two-handed main hand fills the off hand too; the game shows it there, faded.
  const shadow = offHandShadow(bySlot.get("Main hand")?.itemId, bySlot.get("Off hand")?.itemId);
  const spell = size === "hero" ? 22 : 18;
  return (
    <div
      className={`loadout-board is-${size}${interactive ? " is-interactive" : ""}`}
      role={interactive ? "group" : "list"}
      aria-label={label}
    >
      {columns.map((column, c) => (
        <div key={c} className="loadout-board-column">
          {column.map((slot) => {
            const piece = bySlot.get(slot);
            const ghost = slot === "Off hand" && !piece ? shadow : null;
            const mark = slotMarks[slot];
            const skills = piece?.skills ?? [];
            const actives = skills.filter((id) => !id.startsWith("PASSIVE"));
            const passive = skills.find((id) => id.startsWith("PASSIVE"));
            const active = !abilities
              ? []
              : choices
                ? [...actives.slice(0, slot === "Main hand" ? 2 : 1), ...(passive ? [passive] : [])]
                : actives.slice(0, 3);
            const name = piece?.name ?? piece?.itemId;
            const Slot = interactive ? "button" : "div";
            return (
              <Slot
                key={slot}
                {...(interactive
                  ? {
                      type: "button" as const,
                      "aria-pressed": selectedSlot === slot,
                      "aria-label": opensPicker?.(slot)
                        ? `Choose ${slot} equipment: ${piece ? name : ghost ? "held by the two-handed main hand" : "Empty"}`
                        : piece
                          ? `Inspect ${slot}: ${name}`
                          : ghost
                            ? `Inspect ${slot}: held by the two-handed main hand`
                            : `Inspect ${slot} Empty`,
                      onClick: () => onSelectSlot(slot),
                    }
                  : { role: "listitem" })}
                className={`loadout-board-slot${piece ? " is-equipped" : ghost ? " is-two-handed" : " is-empty"}${slot === "Mount" ? " is-mount" : ""}${selectedSlot === slot ? " is-selected" : ""}${flaggedSlot === slot ? " is-flagged" : ""}`}
                data-slot={slot}
              >
                <span
                  // A new piece remounts its cell, so the editor's equip animation plays
                  key={piece?.itemId ?? "empty"}
                  className="loadout-board-cell"
                  title={
                    piece
                      ? `${slot}: ${name}`
                      : ghost
                        ? `${slot}: held by the two-handed ${ghost}`
                        : `${slot}: ${interactive ? "empty" : "not recorded"}`
                  }
                >
                  {piece ? (
                    <ItemIcon id={piece.itemId} size={icon} />
                  ) : ghost ? (
                    <span className="loadout-board-shadow" aria-hidden="true">
                      <ItemIcon id={ghost} size={icon} />
                    </span>
                  ) : mark ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark
                    <img
                      className="loadout-board-mark"
                      data-slot-mark={slot}
                      src={mark}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : null}
                  {piece?.swap && (
                    <span className="loadout-board-swap" aria-hidden="true">
                      <ItemIcon id={piece.swap} size={24} />
                    </span>
                  )}
                </span>
                {abilities && (
                  <span
                    className="loadout-board-abilities"
                    aria-label={active.length ? `${slot} abilities` : undefined}
                  >
                    {active.map((id) => (
                      <span key={id} title={spellNames[id] ?? id}>
                        <SpellIcon id={id} name={spellNames[id] ?? id} size={spell} />
                      </span>
                    ))}
                  </span>
                )}
              </Slot>
            );
          })}
        </div>
      ))}
    </div>
  );
}

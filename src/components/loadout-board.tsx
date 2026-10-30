import "@/app/loadout-board.css";
import { ItemIcon } from "@/components/item-icon";
import { SpellIcon } from "@/components/spell-icon";
import type { BoardSlot } from "@/components/loadout-glyphs";

/** The owner's slot marks (public/albion/slots): bag, cape, potion, food and mount, plus the
 * figure behind the board. Head, chest, boots and the hands stay as empty wells, as in the game. */
const slotMarks: Partial<Record<BoardSlot, string>> = {
  Bag: "/albion/slots/bag.png",
  Cape: "/albion/slots/cape.png",
  Potion: "/albion/slots/potion.png",
  Food: "/albion/slots/food.png",
  Mount: "/albion/slots/mount.png",
};

export type BoardPiece = { slot: string; itemId: string; skills?: string[] };

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
  label = "Equipment",
}: {
  pieces: BoardPiece[];
  spellNames?: Record<string, string>;
  size?: "hero" | "card" | "mini";
  abilities?: boolean;
  label?: string;
}) {
  const bySlot = new Map(pieces.map((p) => [p.slot, p]));
  const icon = size === "hero" ? 72 : size === "card" ? 56 : 40;
  const spell = size === "hero" ? 22 : 18;
  return (
    <div className={`loadout-board is-${size}`} role="list" aria-label={label}>
      {columns.map((column, c) => (
        <div key={c} className="loadout-board-column">
          {c === 1 && (
            // eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark
            <img
              className="loadout-board-figure"
              src="/albion/slots/figure.png"
              alt=""
              aria-hidden="true"
            />
          )}
          {column.map((slot) => {
            const piece = bySlot.get(slot);
            const mark = slotMarks[slot];
            const active = abilities
              ? (piece?.skills ?? []).filter((id) => !id.startsWith("PASSIVE")).slice(0, 3)
              : [];
            return (
              <div
                key={slot}
                role="listitem"
                className={`loadout-board-slot${piece ? "" : " is-empty"}${slot === "Mount" ? " is-mount" : ""}`}
                data-slot={slot}
              >
                <span
                  className="loadout-board-cell"
                  title={piece ? `${slot}: ${piece.itemId}` : `${slot}: not recorded`}
                >
                  {piece ? (
                    <ItemIcon id={piece.itemId} size={icon} />
                  ) : mark ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark
                    <img className="loadout-board-mark" src={mark} alt="" aria-hidden="true" />
                  ) : null}
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
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

import "@/app/loadout-board.css";
import { ItemIcon } from "@/components/item-icon";
import { SpellIcon } from "@/components/spell-icon";
import { slotGlyphs, LoadoutSilhouette, type BoardSlot } from "@/components/loadout-glyphs";

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
      <LoadoutSilhouette className="loadout-board-figure" />
      {columns.map((column, c) => (
        <div key={c} className="loadout-board-column">
          {column.map((slot) => {
            const piece = bySlot.get(slot);
            const Glyph = slotGlyphs[slot];
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
                  {piece ? <ItemIcon id={piece.itemId} size={icon} /> : <Glyph />}
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

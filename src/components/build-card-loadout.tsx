import { ItemIcon } from "@/components/item-icon";
import { SpellIcon } from "@/components/spell-icon";
import { isTwoHanded } from "@/lib/albion/two-handed";
import type { BoardPiece } from "./loadout-board";
import styles from "./build-card-loadout.module.css";

/** What a card shows under the weapon, in the game's inventory order. */
const worn = ["Helmet", "Chest", "Boots", "Cape", "Bag", "Potion", "Food", "Mount"] as const;

/**
 * A build at card size, weapon first: the main hand (and off hand) large with the chosen
 * abilities under them, then every other recorded piece in a smaller row. Slots nothing was
 * recorded for are not drawn; they collapse into one "+n empty" note that names them.
 * The full anatomical board stays on the build page and in the editor.
 */
export function BuildCardLoadout({
  pieces,
  spellNames = {},
  abilities = true,
  label = "Equipment",
}: {
  pieces: BoardPiece[];
  spellNames?: Record<string, string>;
  /** False when the stored abilities are names rather than spell ids (a player comp's members). */
  abilities?: boolean;
  label?: string;
}) {
  const bySlot = new Map(pieces.map((p) => [p.slot, p]));
  const main = bySlot.get("Main hand");
  const off = bySlot.get("Off hand");
  const hands = [
    main ? { slot: "Main hand", piece: main } : null,
    off ? { slot: "Off hand", piece: off } : null,
  ];
  const rest = worn.flatMap((slot) => {
    const piece = bySlot.get(slot);
    return piece ? [{ slot, piece }] : [];
  });
  // A two-handed weapon fills the off hand; a missing weapon has its own empty well above.
  const empty = [
    ...(off || isTwoHanded(main?.itemId) || !main ? [] : ["Off hand"]),
    ...worn.filter((slot) => !bySlot.has(slot)),
  ];
  const nameOf = (p: BoardPiece) => p.name ?? p.itemId;
  return (
    <div className={`build-card-loadout ${styles.loadout}`} role="group" aria-label={label}>
      <ul className={styles.hands} data-hands={off ? 2 : 1}>
        {hands.map((hand, i) =>
          hand ? (
            <li
              key={hand.slot}
              className={styles.hand}
              data-slot={hand.slot}
              title={`${hand.slot}: ${nameOf(hand.piece)}`}
            >
              <span className={styles.handWell}>
                <ItemIcon id={hand.piece.itemId} size={112} />
                {hand.piece.swap && (
                  <span className={styles.swap} aria-hidden="true">
                    <ItemIcon id={hand.piece.swap} size={28} />
                  </span>
                )}
              </span>
              <span className="sr-only">
                {hand.slot}: {nameOf(hand.piece)}
              </span>
              {abilities && <Spells piece={hand.piece} slot={hand.slot} names={spellNames} />}
            </li>
          ) : i === 0 ? (
            <li key="Main hand" className={`${styles.hand} ${styles.isEmpty}`}>
              <span className={styles.handWell} />
              <span className={styles.noWeapon}>
                {pieces.length ? "No weapon recorded" : "No equipment recorded"}
              </span>
            </li>
          ) : null,
        )}
      </ul>
      {pieces.length > 0 && (
        <ul className={styles.worn} aria-label="Armor, cape and supplies">
          {rest.map(({ slot, piece }) => (
            <li
              key={slot}
              className={styles.piece}
              data-slot={slot}
              title={`${slot}: ${nameOf(piece)}`}
            >
              <ItemIcon id={piece.itemId} size={56} />
              <span className="sr-only">
                {slot}: {nameOf(piece)}
              </span>
            </li>
          ))}
          {empty.length > 0 && (
            <li
              className={styles.empty}
              data-empty-slots={empty.join(",")}
              title={`Not set: ${empty.join(", ")}`}
            >
              +{empty.length} empty
              <span className="sr-only">: {empty.join(", ")}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The player's choices on a hand, as the game shows them: Q and W (one active on an off hand)
 * plus the passive. */
function Spells({
  piece,
  slot,
  names,
}: {
  piece: BoardPiece;
  slot: string;
  names: Record<string, string>;
}) {
  const skills = piece.skills ?? [];
  const actives = skills.filter((id) => !id.startsWith("PASSIVE"));
  const passive = skills.find((id) => id.startsWith("PASSIVE"));
  const shown = [...actives.slice(0, slot === "Main hand" ? 2 : 1), ...(passive ? [passive] : [])];
  if (!shown.length) return null;
  return (
    <span className={styles.spells} aria-label={`${slot} abilities`}>
      {shown.map((id) => (
        <span key={id} title={names[id] ?? id}>
          <SpellIcon id={id} name={names[id] ?? id} size={30} />
        </span>
      ))}
    </span>
  );
}

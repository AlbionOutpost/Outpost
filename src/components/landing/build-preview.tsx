import { ItemIcon } from "@/components/item-icon";
import { SpellIcon } from "@/components/spell-icon";
import type { LibraryBuild } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";

/** Loadout board in the game's own arrangement: head row, weapon row, consumable row. */
const board = [
  ["Bag", "Helmet", "Cape"],
  ["Main hand", "Chest", "Off hand"],
  ["Potion", "Boots", "Food"],
] as const;

/**
 * One public library build as the Build Library shows it: the recorded equipment on the
 * loadout board and only the abilities the author recorded. Nothing is filled in.
 */
export function BuildPreview({
  build,
  spellNames,
}: {
  build: LibraryBuild;
  spellNames: Record<string, string>;
}) {
  const bySlot = new Map(build.equipment.map((e) => [e.slot, e]));
  const abilities = build.equipment
    .filter((e) => ["Main hand", "Helmet", "Chest", "Boots"].includes(e.slot))
    .flatMap((e) =>
      e.skills.filter((id) => !id.startsWith("PASSIVE")).map((id) => ({ id, slot: e.slot })),
    )
    .slice(0, 6);
  return (
    <div className="build-preview">
      <div className="build-preview-title">
        <strong>{build.title}</strong>
        <span>
          {activityName(build.category)} · {build.weaponName} · by {build.author}
        </span>
      </div>
      <div className="build-preview-board" role="list" aria-label="Equipment">
        {board.flat().map((slot) => {
          const piece = bySlot.get(slot);
          return (
            <div
              key={slot}
              role="listitem"
              className={`build-preview-slot${piece ? "" : " is-empty"}`}
              title={piece ? `${slot}: ${piece.itemId}` : `${slot}: not recorded`}
            >
              {piece ? (
                <ItemIcon id={piece.itemId} size={56} />
              ) : (
                <span className="build-preview-slot-label">{slot}</span>
              )}
            </div>
          );
        })}
      </div>
      {abilities.length > 0 && (
        <div className="build-preview-abilities">
          <span className="build-preview-label">Recorded abilities</span>
          <ul aria-label="Recorded abilities">
            {abilities.map((a) => (
              <li key={`${a.slot}-${a.id}`} title={`${a.slot}: ${spellNames[a.id] ?? a.id}`}>
                <SpellIcon id={a.id} name={spellNames[a.id] ?? a.id} size={30} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

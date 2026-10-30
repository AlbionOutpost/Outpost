import { LoadoutBoard } from "@/components/loadout-board";
import { SpellIcon } from "@/components/spell-icon";
import type { LibraryBuild } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";

/** The game's default keys: Q/W/E on the weapon, D helmet, R chest, F boots. */
const keyed: [string, string][] = [
  ["Main hand", "Q"],
  ["Main hand", "W"],
  ["Main hand", "E"],
  ["Helmet", "D"],
  ["Chest", "R"],
  ["Boots", "F"],
];

/**
 * One public build as the Build Library shows it: the recorded gear on the loadout board and
 * the recorded abilities on their default keys beside it, passives beneath. Only what the
 * author recorded is shown; an unrecorded key stays empty.
 */
export function BuildCard({
  build,
  spellNames,
}: {
  build: LibraryBuild;
  spellNames: Record<string, string>;
}) {
  const bySlot = new Map(build.equipment.map((e) => [e.slot, e]));
  const taken = new Map<string, number>();
  const abilities = keyed.map(([slot, key]) => {
    const active = (bySlot.get(slot)?.skills ?? []).filter((id) => !id.startsWith("PASSIVE"));
    const index = taken.get(slot) ?? 0;
    taken.set(slot, index + 1);
    return { key, id: active[index] };
  });
  const passives = build.equipment
    .flatMap((e) => e.skills.filter((id) => id.startsWith("PASSIVE")))
    .slice(0, 4);
  return (
    <div className="build-card">
      <div className="build-card-title">
        <strong>{build.title}</strong>
        <span className="landing-chips">
          <span className="landing-chip">{activityName(build.category)}</span>
          {build.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="landing-chip is-muted">
              {tag}
            </span>
          ))}
          {build.upvotes ? (
            <span className="landing-chip is-muted">▲ {build.upvotes.toLocaleString("en-US")}</span>
          ) : null}
        </span>
      </div>
      <div className="build-card-body">
        <LoadoutBoard pieces={build.equipment} size="card" abilities={false} />
        <div className="build-card-abilities">
          <span className="build-preview-label">Abilities</span>
          <ul aria-label="Abilities by key">
            {abilities.map(({ key, id }) => (
              <li key={key} className={id ? undefined : "is-empty"}>
                <kbd>{key}</kbd>
                {id ? (
                  <span title={spellNames[id] ?? id}>
                    <SpellIcon id={id} name={spellNames[id] ?? id} size={30} />
                  </span>
                ) : (
                  <span className="build-card-empty" title="Not recorded" />
                )}
              </li>
            ))}
          </ul>
          {passives.length > 0 && (
            <>
              <span className="build-preview-label">Passive</span>
              <ul className="build-card-passives" aria-label="Passives">
                {passives.map((id, i) => (
                  <li key={`${id}-${i}`} title={spellNames[id] ?? id}>
                    <SpellIcon id={id} name={spellNames[id] ?? id} size={24} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

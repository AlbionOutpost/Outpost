"use client";
import { useId, useState } from "react";
import Link from "@/components/link";
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

export type ShowcaseBuild = Pick<
  LibraryBuild,
  "slug" | "title" | "category" | "weaponName" | "author" | "equipment" | "tags" | "upvotes"
> & { label: string };

/**
 * One public build per activity, switched with the tabs: the recorded gear on the loadout
 * board, the recorded abilities on their default keys, passives beneath. Only what each
 * author recorded is shown.
 */
export function BuildShowcase({
  builds,
  spellNames,
  suffix,
}: {
  builds: ShowcaseBuild[];
  spellNames: Record<string, string>;
  suffix: string;
}) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const build = builds[index] ?? builds[0];
  const bySlot = new Map(build.equipment.map((e) => [e.slot, e]));
  const taken = new Map<string, number>();
  const abilities = keyed.map(([slot, key]) => {
    const active = (bySlot.get(slot)?.skills ?? []).filter((s) => !s.startsWith("PASSIVE"));
    const n = taken.get(slot) ?? 0;
    taken.set(slot, n + 1);
    return { key, id: active[n] };
  });
  const passives = build.equipment
    .flatMap((e) => e.skills.filter((s) => s.startsWith("PASSIVE")))
    .slice(0, 4);
  return (
    <div className="build-showcase">
      <div className="preview-tabs is-wide" role="tablist" aria-label="Activity">
        {builds.map((b, i) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            id={`${id}-${i}`}
            aria-selected={index === i}
            onClick={() => setIndex(i)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="build-card-title">
        <Link href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}>
          <strong>{build.title}</strong>
        </Link>
        <span className="landing-chips">
          <span className="landing-chip">{activityName(build.category)}</span>
          <span className="landing-chip is-muted">{build.weaponName}</span>
          {build.upvotes ? (
            <span className="landing-chip is-muted">▲ {build.upvotes.toLocaleString("en-US")}</span>
          ) : null}
        </span>
      </div>
      <div className="build-card-body">
        <LoadoutBoard pieces={build.equipment} size="card" abilities={false} label={build.title} />
        <div className="build-card-abilities">
          <span className="build-preview-label">Abilities</span>
          <ul aria-label="Abilities by key">
            {abilities.map(({ key, id: spell }) => (
              <li key={key} className={spell ? undefined : "is-empty"}>
                <kbd>{key}</kbd>
                {spell ? (
                  <span title={spellNames[spell] ?? spell}>
                    <SpellIcon id={spell} name={spellNames[spell] ?? spell} size={30} />
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
                {passives.map((spell, i) => (
                  <li key={`${spell}-${i}`} title={spellNames[spell] ?? spell}>
                    <SpellIcon id={spell} name={spellNames[spell] ?? spell} size={24} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <p className="build-showcase-foot">
        By {build.author} · {build.equipment.length} recorded pieces · mount not recorded
      </p>
    </div>
  );
}

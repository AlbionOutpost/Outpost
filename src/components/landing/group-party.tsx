import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { LoadoutBoard } from "@/components/loadout-board";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";

/**
 * One public group build as a party: each required member on a mini loadout board, the
 * optional swaps beneath. Roles are not recorded in the library, so none are claimed.
 * Phones get the same members as a compact list instead of a strip of boards.
 */
export function GroupParty({
  composition,
  members,
  suffix,
}: {
  composition: LibraryComposition;
  members: LibraryBuild[];
  suffix: string;
}) {
  const lookup = new Map(members.map((b) => [b.id, b]));
  const required = composition.members.filter((id) => !composition.optional.includes(id));
  const optional = composition.members.filter((id) => composition.optional.includes(id));
  const href = (b: LibraryBuild) => `/builds/library/${encodeURIComponent(b.slug)}${suffix}`;
  return (
    <div className="group-party">
      <div className="group-party-title">
        <strong>{composition.title}</strong>
        <span>
          {activityName(composition.category)} · {required.length} required
          {optional.length ? ` + ${optional.length} optional` : ""} · by {composition.author}
        </span>
      </div>
      <ol className="group-party-boards" aria-label="Required members">
        {required.map((id, index) => {
          const build = lookup.get(id);
          return (
            <li key={`${id}-${index}`}>
              {build ? (
                <Link href={href(build)} className="group-party-member">
                  <LoadoutBoard
                    pieces={build.equipment}
                    size="mini"
                    abilities={false}
                    label={build.title}
                  />
                  <strong>{build.weaponName}</strong>
                </Link>
              ) : (
                <span className="group-party-member is-missing">
                  <strong>Loadout unavailable</strong>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {optional.length > 0 && (
        <div className="group-party-optional">
          <span className="build-preview-label">Optional swaps</span>
          <ul aria-label="Optional members">
            {optional.map((id, index) => {
              const build = lookup.get(id);
              const main = build?.equipment.find((e) => e.slot === "Main hand");
              return (
                <li key={`${id}-${index}`}>
                  {build ? (
                    <Link href={href(build)}>
                      {main && <ItemIcon id={main.itemId} size={24} />}
                      <span>{build.weaponName}</span>
                    </Link>
                  ) : (
                    <span>Loadout unavailable</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ol className="group-party-list" aria-label="Members">
        {composition.members.map((id, index) => {
          const build = lookup.get(id);
          const main = build?.equipment.find((e) => e.slot === "Main hand");
          const isOptional = composition.optional.includes(id);
          return (
            <li key={`${id}-${index}`} className={isOptional ? "is-optional" : undefined}>
              {main ? <ItemIcon id={main.itemId} size={32} /> : <span />}
              {build ? (
                <Link href={href(build)}>{build.weaponName}</Link>
              ) : (
                <span>Loadout unavailable</span>
              )}
              <small>{isOptional ? "Optional" : "Required"}</small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

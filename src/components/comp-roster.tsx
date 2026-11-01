import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { weaponRole } from "@/lib/compositions/weapon-roles";
import type { LibraryBuild } from "@/lib/grind-library-types";

/**
 * A comp read as a roster: one row per member with its weapon, the weapon's role by type and
 * the armor pieces. Rows link to the member's build when `suffix` carries the region.
 */
export function CompRoster({
  members,
  suffix = "",
  limit = 5,
  linked = true,
}: {
  members: LibraryBuild[];
  suffix?: string;
  limit?: number;
  linked?: boolean;
}) {
  return (
    <ol className="landing-roster" aria-label="Members by weapon type">
      {members.slice(0, limit).map((b, i) => {
        const weapon = b.equipment.find((e) => e.slot === "Main hand");
        const role = weaponRole(b.weaponName);
        const who = (
          <>
            <strong>{b.weaponName}</strong>
            <span>{role}</span>
          </>
        );
        return (
          <li key={`${b.id}-${i}`} data-role={role}>
            <span className="landing-roster-n">{i + 1}</span>
            <span className="landing-roster-weapon">
              {weapon ? <ItemIcon id={weapon.itemId} size={44} /> : null}
            </span>
            {linked ? (
              <Link
                href={`/builds/library/${encodeURIComponent(b.slug)}${suffix}`}
                className="landing-roster-who"
                title={b.title}
              >
                {who}
              </Link>
            ) : (
              <span className="landing-roster-who" title={b.title}>
                {who}
              </span>
            )}
            <span className="landing-roster-armor" role="group" aria-label="Armor">
              {["Helmet", "Chest", "Boots"].flatMap((slot) => {
                const it = b.equipment.find((e) => e.slot === slot);
                return it ? [<ItemIcon key={slot} id={it.itemId} size={32} />] : [];
              })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

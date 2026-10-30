import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { weaponRole, weaponRoleOrder, type WeaponRole } from "@/lib/compositions/weapon-roles";
import { Crosshair, HeartPulse, Shield, Sparkles } from "lucide-react";

const roleIcon: Record<WeaponRole, typeof Shield> = {
  Tank: Shield,
  Healer: HeartPulse,
  DPS: Crosshair,
  Support: Sparkles,
};

/**
 * One public group build read as a party: members grouped by the role their weapon line
 * implies, every member as its real main-hand render, optional swaps marked. The library
 * records no role assignments, so the rows say "by weapon type".
 */
export function GroupRoles({
  composition,
  members,
  suffix,
}: {
  composition: LibraryComposition;
  members: LibraryBuild[];
  suffix: string;
}) {
  const lookup = new Map(members.map((b) => [b.id, b]));
  const rows = weaponRoleOrder.map((role) => ({
    role,
    members: composition.members
      .map((id, index) => ({ id, index, build: lookup.get(id) }))
      .filter((m) => m.build && weaponRole(m.build.weaponName) === role),
  }));
  const unresolved = composition.members.filter((id) => !lookup.has(id)).length;
  return (
    <div className="group-roles">
      {rows.map(({ role, members }) => {
        const Icon = roleIcon[role];
        return (
          <div key={role} className="group-role" data-role={role}>
            <span className="group-role-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className="group-role-name">
              {role}
              <small>
                {members.length
                  ? `${members.length} ${members.length === 1 ? "slot" : "slots"}`
                  : "none here"}
              </small>
            </span>
            <ul className="group-role-members" aria-label={`${role} members`}>
              {members.map(({ id, index, build }) => {
                const main = build!.equipment.find((e) => e.slot === "Main hand");
                const optional = composition.optional.includes(id);
                return (
                  <li key={`${id}-${index}`} className={optional ? "is-optional" : undefined}>
                    <Link
                      href={`/builds/library/${encodeURIComponent(build!.slug)}${suffix}`}
                      title={`${build!.weaponName}${optional ? " (optional)" : ""}: ${build!.title}`}
                      aria-label={`${build!.weaponName}${optional ? ", optional" : ""}`}
                    >
                      {main ? <ItemIcon id={main.itemId} size={40} /> : <span />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {unresolved > 0 && (
        <p className="landing-preview-status">
          {unresolved} member {unresolved === 1 ? "loadout is" : "loadouts are"} unavailable.
        </p>
      )}
    </div>
  );
}

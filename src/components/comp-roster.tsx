import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { weaponRole } from "@/lib/compositions/weapon-roles";
import type { LibraryBuild } from "@/lib/grind-library-types";

/** One member as a roster row: weapon, what it plays, armor pieces. */
export type RosterMember = {
  key: string;
  /** Weapon render; empty slots show an empty well. */
  weapon?: { itemId: string; quality?: number };
  /** The bold line: the weapon's name, or what the slot still needs. */
  name: string;
  /** The coloured line under it: the role. */
  role: string;
  /** Tank, Healer, DPS or Support: picks the edge colour. */
  tone?: string;
  /** The player who takes the slot, when one is named. */
  player?: string;
  armor: { itemId: string; quality?: number }[];
  href?: string;
  title?: string;
};

/** The roster row's cells, for lists that wrap them in their own element (a toggle, a link). */
export function RosterRowCells({ member, n }: { member: RosterMember; n: number }) {
  return (
    <>
      <span className="landing-roster-n">{n}</span>
      <span className="landing-roster-weapon">
        {member.weapon ? (
          <ItemIcon id={member.weapon.itemId} quality={member.weapon.quality} size={44} />
        ) : null}
      </span>
      <span className="landing-roster-who">
        <RosterWho member={member} />
      </span>
      <RosterArmor member={member} />
    </>
  );
}

function RosterWho({ member }: { member: RosterMember }) {
  return (
    <>
      <strong>{member.name}</strong>
      <span>
        {member.role}
        {member.player && <small className="landing-roster-player"> · {member.player}</small>}
      </span>
    </>
  );
}

function RosterArmor({ member }: { member: RosterMember }) {
  return (
    <span className="landing-roster-armor" role="group" aria-label="Armor">
      {member.armor.map((it, i) => (
        <ItemIcon key={i} id={it.itemId} quality={it.quality} size={32} />
      ))}
    </span>
  );
}

/** A comp read as a roster: one row per member, the role's colour on the edge. */
export function RosterRows({
  members,
  limit = 5,
  label = "Members by weapon type",
}: {
  members: RosterMember[];
  limit?: number;
  label?: string;
}) {
  return (
    <ol className="landing-roster" aria-label={label}>
      {members.slice(0, limit).map((m, i) => (
        <li key={m.key} data-role={m.tone}>
          <span className="landing-roster-n">{i + 1}</span>
          <span className="landing-roster-weapon">
            {m.weapon ? (
              <ItemIcon id={m.weapon.itemId} quality={m.weapon.quality} size={44} />
            ) : null}
          </span>
          {m.href ? (
            <Link href={m.href} className="landing-roster-who" title={m.title}>
              <RosterWho member={m} />
            </Link>
          ) : (
            <span className="landing-roster-who" title={m.title}>
              <RosterWho member={m} />
            </span>
          )}
          <RosterArmor member={m} />
        </li>
      ))}
    </ol>
  );
}

/** A library member as a roster row; its role is read from the weapon type. */
export function libraryRosterMember(b: LibraryBuild, i: number, href?: string): RosterMember {
  const weapon = b.equipment.find((e) => e.slot === "Main hand");
  const role = weaponRole(b.weaponName);
  return {
    key: `${b.id}-${i}`,
    weapon: weapon ? { itemId: weapon.itemId } : undefined,
    name: b.weaponName,
    role,
    tone: role,
    armor: ["Helmet", "Chest", "Boots"].flatMap((slot) => {
      const it = b.equipment.find((e) => e.slot === slot);
      return it ? [{ itemId: it.itemId }] : [];
    }),
    href,
    title: b.title,
  };
}

/**
 * A library comp read as a roster: one row per member with its weapon, the weapon's role by
 * type and the armor pieces. Rows link to the member's build when `linked` (with `suffix`
 * carrying the region).
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
    <RosterRows
      limit={limit}
      members={members.map((b, i) =>
        libraryRosterMember(
          b,
          i,
          linked ? `/builds/library/${encodeURIComponent(b.slug)}${suffix}` : undefined,
        ),
      )}
    />
  );
}

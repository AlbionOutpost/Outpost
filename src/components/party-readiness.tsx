"use client";
import type { MemberSlot } from "@/lib/compositions/validation";
import { AddToShopping } from "./add-to-shopping";
import { equipmentShoppingEntries } from "@/lib/albion/shopping-equipment";
import type { Region } from "@/lib/albion/region-config";
import { memberRole, roleTone } from "@/lib/compositions/roster";
import styles from "./comps.module.css";

/** How ready the party is: the roles it plans, names in slots, weapons chosen, and a shopping list. */
export function PartyReadiness({ members, region }: { members: MemberSlot[]; region: Region }) {
  const roles = new Map<string, { count: number; tone?: string }>();
  for (const member of members) {
    const role = memberRole(member);
    const entry = roles.get(role) ?? { count: 0, tone: roleTone(member.role) };
    entry.count++;
    roles.set(role, entry);
  }
  const assigned = members.filter((member) => member.playerName.trim()).length,
    required = members.filter((member) => member.mandatory),
    equipped = required.filter((member) =>
      member.equipment.some((row) => row.slot === "Main hand" && row.itemId),
    ).length;
  return (
    <section className={styles.readiness} aria-label="Party preparation">
      <dl className={styles.pairs}>
        {[...roles].map(([role, { count, tone }]) => (
          <div key={role} className={styles.pair} data-role={tone}>
            <dt>{role}</dt>
            <dd>{count}</dd>
          </div>
        ))}
        <div className={`${styles.pair} ${styles.pairSplit}`}>
          <dt>Players named</dt>
          <dd>
            {assigned}/{members.length}
          </dd>
        </div>
        <div className={styles.pair}>
          <dt>Required weapons</dt>
          <dd>
            {equipped}/{required.length}
          </dd>
        </div>
      </dl>
      <AddToShopping
        region={region}
        label="Shop party equipment"
        entries={equipmentShoppingEntries(members.flatMap((member) => member.equipment))}
      />
    </section>
  );
}

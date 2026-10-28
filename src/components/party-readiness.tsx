"use client";
import { Shield, HeartPulse, Swords, Sparkles, UsersRound } from "lucide-react";
import type { MemberSlot } from "@/lib/compositions/validation";
import { AddToShopping } from "./add-to-shopping";
import { equipmentShoppingEntries } from "@/lib/albion/shopping-equipment";
import type { Region } from "@/lib/albion/region-config";
export function PartyReadiness({ members, region }: { members: MemberSlot[]; region: Region }) {
  const roles = new Map<string, number>();
  for (const member of members) {
    const role = member.role === "Custom" ? member.customRole || "Custom" : member.role;
    roles.set(role, (roles.get(role) || 0) + 1);
  }
  const assigned = members.filter((member) => member.playerName.trim()).length,
    required = members.filter((member) => member.mandatory),
    equipped = required.filter((member) =>
      member.equipment.some((row) => row.slot === "Main hand" && row.itemId),
    ).length;
  return (
    <section className="party-readiness" aria-label="Party preparation">
      <div className="party-role-counts">
        {[...roles].map(([role, count]) => {
          const name = role.toLowerCase(),
            Icon = name.includes("tank")
              ? Shield
              : name.includes("heal")
                ? HeartPulse
                : name.includes("dps")
                  ? Swords
                  : name.includes("support")
                    ? Sparkles
                    : UsersRound;
          return (
            <div key={role} className={`readiness-role role-${name.replace(/[^a-z0-9]/g, "-")}`}>
              <Icon size={22} />
              <span>
                <strong>
                  {count} {role}
                </strong>
                <small>Planned {count === 1 ? "slot" : "slots"}</small>
              </span>
            </div>
          );
        })}
      </div>
      <div className="party-preparation-summary">
        <strong>Party preparation</strong>
        <span>
          {assigned}/{members.length} players assigned
        </span>
        <span>
          {equipped}/{required.length} required weapons selected
        </span>
        <AddToShopping
          region={region}
          label="Shop party equipment"
          entries={equipmentShoppingEntries(members.flatMap((member) => member.equipment))}
        />
      </div>
    </section>
  );
}

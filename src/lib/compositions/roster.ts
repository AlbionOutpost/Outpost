import { equipmentName } from "../albion/equipment-catalog";
import type { MemberSlot } from "./validation";

/** The role a player sees for a member: a custom role's own name, otherwise the role. */
export function memberRole(slot: Pick<MemberSlot, "role" | "customRole">) {
  return slot.role === "Custom" ? slot.customRole || "Custom role" : slot.role;
}

/** The edge colour family of a recorded role (the roster's Tank / Healer / DPS / Support). */
export function roleTone(role: MemberSlot["role"]) {
  if (role === "Tank" || role === "Healer") return role;
  if (role === "Support" || role === "Defensive support") return "Support";
  if (role === "Melee DPS" || role === "Ranged DPS" || role === "Pierce" || role === "Engage")
    return "DPS";
  return undefined;
}

/** A saved comp member as a roster row (see `RosterRows`). */
export function slotRosterMember(slot: MemberSlot, href?: string) {
  const piece = (name: string) => slot.equipment.find((e) => e.slot === name);
  const weapon = piece("Main hand");
  return {
    key: slot.id,
    weapon: weapon && { itemId: weapon.itemId, quality: weapon.quality },
    name: weapon ? equipmentName(weapon.itemId) : "No weapon chosen",
    role: memberRole(slot),
    tone: roleTone(slot.role),
    player: slot.playerName || undefined,
    armor: ["Helmet", "Chest", "Boots"].flatMap((name) => {
      const it = piece(name);
      return it ? [{ itemId: it.itemId, quality: it.quality }] : [];
    }),
    href,
  };
}

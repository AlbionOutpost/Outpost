import sourceAbilities from "./source-abilities.json" with { type: "json" };
import { findEquipment } from "./equipment-catalog";
const source = sourceAbilities as Record<string, Record<string, string[]>>;
/** Names listed by the pinned July API snapshot, plus retained starter references. Character/tier unlocks and current patch remain unverified. */
export function abilitiesFor(id: string): Record<string, string[]> {
  const found = findEquipment(id);
  if (!found) return {};
  const listed = source[id.split("@")[0]] || {};
  // Starter references covered T4–T8; do not invent beginner/journeyman spells.
  const retained = found.tier >= 4 ? found.family.abilities : {};
  return Object.fromEntries(
    [...new Set([...Object.keys(retained), ...Object.keys(listed)])].map((key) => [
      key,
      [...new Set(listed[key] || retained[key] || [])],
    ]),
  );
}

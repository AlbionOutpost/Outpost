import sourceAbilities from "./source-abilities.json" with { type: "json" };
import { findEquipment } from "./equipment-catalog";
import archivedSpells from "./archived-spell-options.json" with { type: "json" };
import archivedItems from "./archived-item-spells.json" with { type: "json" };
export function archivedSpellOptions(id: string): { key: string; id: string; name: string }[] {
  const found = findEquipment(id);
  if (!found || found.tier < 4) return [];
  return (
    (archivedItems as Record<string, { key: string; id: string; name: string }[]>)[
      id.split("@")[0]
    ] ||
    (archivedSpells as Record<string, { key: string; id: string; name: string }[]>)[
      found.family.code
    ] ||
    []
  );
}
const source = sourceAbilities as Record<string, Record<string, string[]>>;
/** Names listed by the pinned July API snapshot, plus retained starter references. Character/tier unlocks and current patch remain unverified. */
export function abilitiesFor(id: string): Record<string, string[]> {
  const found = findEquipment(id);
  if (!found) return {};
  const listed = source[id.split("@")[0]] || {};
  // Starter references covered T4–T8; do not invent beginner/journeyman spells.
  const retained = found.tier >= 4 ? found.family.abilities : {};
  const options = Object.fromEntries(
    [...new Set([...Object.keys(retained), ...Object.keys(listed)])].map((key) => [
      key,
      [...new Set(listed[key] || retained[key] || [])],
    ]),
  );
  for (const spell of archivedSpellOptions(id))
    options[spell.key] = [...new Set([...(options[spell.key] || []), spell.name])];
  return options;
}

export type ItemAbility = {
  id: string;
  name: string;
  slot: string;
  unlock: string | null;
  source: "snapshot" | "archive";
};
const slotOrder = ["Q", "W", "E", "Passive", "Passive 2", "Active"];
/**
 * An item page's abilities: the pinned item snapshot's list, plus the archived build library's
 * spells for this exact item (the list the build editor offers), each tagged with its source.
 * Nothing is derived from names; an item neither source records has none.
 */
export function itemAbilities(
  id: string,
  snapshot: { id: string; name: string; slot: string; unlock: string | null }[],
): ItemAbility[] {
  const rows: ItemAbility[] = snapshot.map((a) => ({ ...a, source: "snapshot" }));
  for (const spell of archivedSpellOptions(id))
    if (!rows.some((row) => row.id === spell.id && row.slot === spell.key))
      rows.push({
        id: spell.id,
        name: spell.name,
        slot: spell.key,
        unlock: null,
        source: "archive",
      });
  const rank = (slot: string) => (slotOrder.includes(slot) ? slotOrder.indexOf(slot) : 99);
  return rows.sort((a, b) => rank(a.slot) - rank(b.slot));
}

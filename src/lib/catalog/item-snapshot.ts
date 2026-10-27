import { z } from "zod";
import { catalogItem } from "./validation";

export const snapshotSlots = {
  mainhand: "Main hand",
  offhand: "Off hand",
  head: "Helmet",
  armor: "Chest",
  shoes: "Boots",
  cape: "Cape",
  bag: "Bag",
  mount: "Mount",
  food: "Food",
  potion: "Potion",
} as const;
const spell = z.object({
  uniqueName: z.string().min(1).max(100),
  localizedNames: z.object({ "EN-US": z.string().nullable().optional() }).nullable(),
});
const variant = z.object({
  enchantmentLevel: z.number().int().min(0).max(4),
  itemPower: catalogItem.shape.itemPower.optional(),
});
const sourceItem = z.object({
  uniqueName: z.string().max(100),
  tier: z.number().int().min(1).max(8),
  enchantmentLevel: z.number().int().min(0).max(4),
  slotType: z.enum(
    Object.keys(snapshotSlots) as [
      keyof typeof snapshotSlots,
      ...Array<keyof typeof snapshotSlots>,
    ],
  ),
  categoryId: z.string().max(100),
  revision: z.number().int(),
  localizedNames: z.object({ "EN-US": z.string().nullable().optional() }).nullable(),
  itemPower: catalogItem.shape.itemPower.optional(),
  activeSlots: z.record(z.string(), z.array(spell).max(100)),
  passiveSlots: z.record(z.string(), z.array(spell).max(100)),
  enchantments: z.object({ enchantments: z.array(variant).max(4) }).nullable(),
});

/** Only factual identity/slot/power and spell names. No prose, artwork or inferred unlocks. */
export function normalizeItemSnapshot(
  raw: unknown,
  expectedSlot: keyof typeof snapshotSlots,
  sourceUrl: string,
) {
  const rows = z.array(sourceItem).max(10000).parse(raw);
  const items: z.infer<typeof catalogItem>[] = [];
  const excluded: { id: string; reason: string }[] = [];
  const sourceCategories = new Set<string>();
  for (const row of rows) {
    if (row.slotType !== expectedSlot) throw new Error("Source slot disagrees with its file");
    if (
      !catalogItem.shape.id.safeParse(row.uniqueName).success ||
      !row.localizedNames?.["EN-US"]?.trim()
    ) {
      excluded.push({
        id: row.uniqueName,
        reason: "Unsupported identifier or absent English name",
      });
      continue;
    }
    const identity = /^T([1-8])_.+?(?:@([1-4]))?$/.exec(row.uniqueName)!;
    if (Number(identity[1]) !== row.tier || Number(identity[2] || 0) !== row.enchantmentLevel) {
      excluded.push({
        id: row.uniqueName,
        reason: "Source tier/enchantment disagrees with identifier; not corrected by inference",
      });
      continue;
    }
    sourceCategories.add(row.categoryId);
    const abilities: z.infer<typeof catalogItem>["abilities"] = [];
    for (const [passive, slots] of [
      [false, row.activeSlots],
      [true, row.passiveSlots],
    ] as const) {
      for (const [index, spells] of Object.entries(slots)) {
        const slot = passive
          ? index === "1"
            ? "Passive"
            : `Passive ${index}`
          : expectedSlot === "mainhand"
            ? ({ "1": "Q", "2": "W", "3": "E" }[index] ?? `Active ${index}`)
            : index === "1"
              ? "Active"
              : `Active ${index}`;
        for (const ability of spells) {
          const name = ability.localizedNames?.["EN-US"];
          if (name?.trim())
            abilities.push({ id: ability.uniqueName, name, slot, unlock: null, sourceUrl });
        }
      }
    }
    items.push(
      catalogItem.parse({
        id: row.uniqueName,
        name: row.localizedNames["EN-US"],
        slot: snapshotSlots[expectedSlot],
        tier: row.tier,
        enchantment: row.enchantmentLevel,
        itemPower: row.itemPower ?? null,
        abilities,
        recipe: null,
      }),
    );
    // The source explicitly enumerates these variants. Spell/unlock inheritance is not certified.
    for (const enchantment of row.enchantments?.enchantments ?? []) {
      if (row.enchantmentLevel !== 0 || enchantment.enchantmentLevel === 0)
        throw new Error("Ambiguous nested enchantment identity");
      items.push(
        catalogItem.parse({
          id: `${row.uniqueName}@${enchantment.enchantmentLevel}`,
          name: `${row.localizedNames["EN-US"]} · .${enchantment.enchantmentLevel}`,
          slot: snapshotSlots[expectedSlot],
          tier: row.tier,
          enchantment: enchantment.enchantmentLevel,
          itemPower: enchantment.itemPower ?? null,
          abilities: [],
          recipe: null,
        }),
      );
    }
  }
  if (new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error("Duplicate snapshot identity");
  return {
    items,
    sourceRows: rows.length,
    excluded,
    sourceCategories: [...sourceCategories].sort(),
  };
}

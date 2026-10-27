import { z } from "zod";
import { equipmentChoice, validHandCombination } from "./equipment-validation";
export const equipmentSet = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(60),
    equipment: z
      .array(equipmentChoice)
      .min(1)
      .max(10)
      .refine(
        (rows) => new Set(rows.map((row) => row.slot)).size === rows.length,
        "Equipment slots must be unique",
      )
      .refine(validHandCombination, "A two-handed weapon cannot be used with an off hand"),
  })
  .strict();
export const equipmentSets = z
  .array(equipmentSet)
  .max(5)
  .refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    "Set identifiers must be unique",
  )
  .default([]);
export type EquipmentSet = z.infer<typeof equipmentSet>;
export const loadoutTemplates = [
  {
    id: "battleaxe",
    name: "Battleaxe starting set",
    description:
      "Ten editable slots. Choose abilities yourself; this is not a current-meta recommendation.",
    items: [
      ["Main hand", "T4_MAIN_AXE"],
      ["Off hand", "T4_OFF_SHIELD"],
      ["Helmet", "T4_HEAD_CLOTH_SET1"],
      ["Chest", "T4_ARMOR_LEATHER_SET1"],
      ["Boots", "T4_SHOES_LEATHER_SET1"],
      ["Cape", "T4_CAPE"],
      ["Bag", "T4_BAG"],
      ["Mount", "T3_MOUNT_HORSE"],
      ["Food", "T4_MEAL_STEW"],
      ["Potion", "T4_POTION_HEAL"],
    ],
  },
  {
    id: "essentials",
    name: "Travel essentials",
    description: "Bag, cape, riding horse and consumables. Add your own weapon and armour.",
    items: [
      ["Cape", "T4_CAPE"],
      ["Bag", "T4_BAG"],
      ["Mount", "T3_MOUNT_HORSE"],
      ["Food", "T4_MEAL_STEW"],
      ["Potion", "T4_POTION_HEAL"],
    ],
  },
] as const;
export function templateEquipment(id: string) {
  const template = loadoutTemplates.find((t) => t.id === id);
  if (!template) throw Error("Choose a loadout template");
  return template.items.map(([slot, itemId]) =>
    equipmentChoice.parse({ slot, itemId, quality: 1, abilities: {}, alternatives: [] }),
  );
}

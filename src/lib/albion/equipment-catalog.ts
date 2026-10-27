import sourceEquipment from "./source-equipment.json" with { type: "json" };
import { items } from "./item-database";
const factualNames = new Map(items.map((item) => [item.id, item.name]));
// Original factual catalog. Sources in DATA_SOURCES.md. No copied descriptions or combat statistics.
export const equipmentSlots = [
  "Main hand",
  "Off hand",
  "Helmet",
  "Chest",
  "Boots",
  "Cape",
  "Bag",
  "Mount",
  "Food",
  "Potion",
] as const;
export type EquipmentSlot = (typeof equipmentSlots)[number];
export type Family = {
  variants?: Record<number, number>;
  twoHanded?: boolean;
  code: string;
  name: string;
  slot: EquipmentSlot;
  tiers: number[];
  enchants: number[];
  abilities: Record<string, string[]>;
  source: string;
  tierNames?: Record<number, string>;
};
const official = "https://albiononline.com/news/basic-builds-battleaxe";
export const equipmentFamilies: Family[] = [
  {
    code: "MEAL_STEW",
    name: "Stew",
    slot: "Food",
    tiers: [4, 6, 8],
    enchants: [0, 1, 2, 3],
    tierNames: { 4: "Goat Stew", 6: "Mutton Stew", 8: "Beef Stew" },
    abilities: {},
    source:
      "https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/food.json",
  },
  {
    code: "POTION_HEAL",
    name: "Healing Potion",
    slot: "Potion",
    tiers: [2, 4, 6],
    enchants: [0, 1, 2, 3],
    tierNames: { 2: "Minor Healing Potion", 4: "Healing Potion", 6: "Major Healing Potion" },
    abilities: {},
    source:
      "https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/potion.json",
  },
  {
    code: "MAIN_AXE",
    name: "Battleaxe",
    slot: "Main hand",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: {
      Q: ["Rending Strike", "Rending Spin"],
      W: ["Adrenaline Boost"],
      E: ["Blood Bandit"],
      Passive: ["Deep Cuts"],
    },
    source: official,
  },
  {
    code: "OFF_SHIELD",
    name: "Shield",
    slot: "Off hand",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: {},
    source: official,
  },
  {
    code: "HEAD_CLOTH_SET1",
    name: "Scholar Cowl",
    slot: "Helmet",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: { Active: ["Energy Shield"] },
    source: official,
  },
  {
    code: "ARMOR_LEATHER_SET1",
    name: "Mercenary Jacket",
    slot: "Chest",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: { Active: ["Bloodlust"] },
    source: official,
  },
  {
    code: "SHOES_LEATHER_SET1",
    name: "Mercenary Shoes",
    slot: "Boots",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: { Active: ["Refreshing Sprint"] },
    source: official,
  },
  {
    code: "CAPE",
    name: "Cape",
    slot: "Cape",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: {},
    source: official,
  },
  {
    code: "BAG",
    name: "Bag",
    slot: "Bag",
    tiers: [4, 5, 6, 7, 8],
    enchants: [0, 1, 2, 3, 4],
    abilities: {},
    source: official,
  },
  {
    code: "MOUNT_HORSE",
    name: "Riding Horse",
    slot: "Mount",
    tiers: [3, 4, 5, 6, 7, 8],
    enchants: [0],
    abilities: {},
    source: official,
  },
];
for (const family of equipmentFamilies) {
  const sourced = (sourceEquipment as Family[]).find((row) => row.code === family.code);
  if (sourced)
    Object.assign(family, {
      tiers: sourced.tiers,
      enchants: sourced.enchants,
      variants: sourced.variants,
      twoHanded: sourced.twoHanded,
      tierNames: { ...sourced.tierNames, ...family.tierNames },
    });
}
const existingCodes = new Set(equipmentFamilies.map((f) => f.code));
equipmentFamilies.push(...(sourceEquipment as Family[]).filter((f) => !existingCodes.has(f.code)));
export function equipmentId(family: Family, tier: number, enchantment: number) {
  return `T${tier}_${family.code}${enchantment ? `@${enchantment}` : ""}`;
}
export function findEquipment(id: string) {
  const match = /^T([1-8])_(.+?)(?:@([1-4]))?$/.exec(id);
  if (!match) return null;
  const family = equipmentFamilies.find(
    (f) =>
      f.code === match[2] &&
      f.tiers.includes(Number(match[1])) &&
      f.enchants.includes(Number(match[3] || 0)) &&
      (!f.variants || !!(f.variants[Number(match[1])] & (1 << Number(match[3] || 0)))),
  );
  return family ? { family, tier: Number(match[1]), enchantment: Number(match[3] || 0) } : null;
}
export function equipmentName(id: string) {
  const found = findEquipment(id);
  return found
    ? `${found.family.tierNames?.[found.tier] || found.family.name} · T${found.tier}.${found.enchantment}`
    : factualNames.get(id) || id;
}

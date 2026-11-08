/**
 * Crafting categories as the game data records them (`craftingCategory` on each recipe in
 * `game/recipes.json`), with player-facing names. Client-safe: no recipe data is imported here.
 */
export const craftCategories = [
  { id: "sword", label: "Swords", group: "Weapons" },
  { id: "axe", label: "Axes", group: "Weapons" },
  { id: "mace", label: "Maces", group: "Weapons" },
  { id: "hammer", label: "Hammers", group: "Weapons" },
  { id: "knuckles", label: "War gloves", group: "Weapons" },
  { id: "crossbow", label: "Crossbows", group: "Weapons" },
  { id: "spear", label: "Spears", group: "Weapons" },
  { id: "dagger", label: "Daggers", group: "Weapons" },
  { id: "quarterstaff", label: "Quarterstaffs", group: "Weapons" },
  { id: "bow", label: "Bows", group: "Weapons" },
  { id: "shapeshifterstaff", label: "Shapeshifter staffs", group: "Weapons" },
  { id: "naturestaff", label: "Nature staffs", group: "Weapons" },
  { id: "firestaff", label: "Fire staffs", group: "Weapons" },
  { id: "froststaff", label: "Frost staffs", group: "Weapons" },
  { id: "arcanestaff", label: "Arcane staffs", group: "Weapons" },
  { id: "holystaff", label: "Holy staffs", group: "Weapons" },
  { id: "cursestaff", label: "Cursed staffs", group: "Weapons" },
  { id: "offhand", label: "Off-hands", group: "Weapons" },
  { id: "plate_helmet", label: "Plate helmets", group: "Armor" },
  { id: "plate_armor", label: "Plate armor", group: "Armor" },
  { id: "plate_shoes", label: "Plate shoes", group: "Armor" },
  { id: "leather_helmet", label: "Leather hoods", group: "Armor" },
  { id: "leather_armor", label: "Leather jackets", group: "Armor" },
  { id: "leather_shoes", label: "Leather shoes", group: "Armor" },
  { id: "cloth_helmet", label: "Cloth cowls", group: "Armor" },
  { id: "cloth_armor", label: "Cloth robes", group: "Armor" },
  { id: "cloth_shoes", label: "Cloth sandals", group: "Armor" },
  { id: "bag", label: "Bags", group: "Accessories" },
  { id: "cape", label: "Capes", group: "Accessories" },
  { id: "gatherergear", label: "Gathering gear", group: "Gathering" },
  { id: "tools", label: "Tools", group: "Gathering" },
  { id: "food", label: "Food", group: "Consumables" },
  { id: "potion", label: "Potions", group: "Consumables" },
] as const;
export type CraftCategory = (typeof craftCategories)[number]["id"];
export const craftCategoryIds = craftCategories.map((c) => c.id) as [
  CraftCategory,
  ...CraftCategory[],
];
/** The Black Market board compares gear; food and potions stay in the craft finder only. */
export const gearCategories = craftCategories.filter((c) => c.group !== "Consumables");
export const gearCategoryIds = gearCategories.map((c) => c.id) as [
  CraftCategory,
  ...CraftCategory[],
];
export const craftCategoryLabel = (id: string) =>
  craftCategories.find((c) => c.id === id)?.label ?? id;
/** At most this many distinct items go into one price request (one AODP call, see DATA.md). */
export const MAX_SCAN_ITEMS = 48;

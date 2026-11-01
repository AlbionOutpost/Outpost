/** Anatomical positions: armour on the central body line, hands and supplies at its sides.
 * Zero-based coordinates are shared by the interactive board and local image exports. */
export const inventoryLayout = [
  { slot: "Bag", area: "bag", row: 0, column: 0 },
  { slot: "Helmet", area: "head", row: 0, column: 1 },
  { slot: "Cape", area: "cape", row: 0, column: 2 },
  { slot: "Main hand", area: "main", row: 1, column: 0 },
  { slot: "Chest", area: "chest", row: 1, column: 1 },
  { slot: "Off hand", area: "off", row: 1, column: 2 },
  { slot: "Potion", area: "potion", row: 2, column: 0 },
  { slot: "Boots", area: "boots", row: 2, column: 1 },
  { slot: "Food", area: "food", row: 2, column: 2 },
  { slot: "Mount", area: "mount", row: 3, column: 1 },
] as const;

export const buildInventoryLayout = inventoryLayout;
export type InventoryLayoutPosition = (typeof inventoryLayout)[number];

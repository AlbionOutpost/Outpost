import { equipmentName } from "./equipment-catalog";
import type { ShoppingEntry } from "./shopping";
import { shoppingKey } from "./shopping";
import type { cities } from "./region-config";
export function equipmentShoppingEntries(
  equipment: { itemId: string; quality: number }[],
  city: (typeof cities)[number] = "Fort Sterling",
): ShoppingEntry[] {
  const rows = new Map<string, ShoppingEntry>();
  for (const item of equipment) {
    if (!item.itemId) continue;
    const row: ShoppingEntry = {
      itemId: item.itemId,
      name: equipmentName(item.itemId),
      city,
      quality: item.quality,
      quantity: 1,
      owned: 0,
      unitPrice: null,
      priceKind: "manual",
      observedAt: null,
    };
    const key = shoppingKey(row),
      previous = rows.get(key);
    rows.set(key, previous ? { ...previous, quantity: previous.quantity + 1 } : row);
  }
  return [...rows.values()];
}

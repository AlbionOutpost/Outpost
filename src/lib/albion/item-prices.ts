import { z } from "zod";
import { regionSchema } from "./region-config";
import { isStale } from "./freshness";

/** One page of the item database (`PAGE_SIZE` in `catalog/item-search.ts`): one request per page. */
export const ITEM_PRICE_BATCH = 30;
const itemId = z.string().regex(/^[A-Z0-9_@]{3,100}$/);

/** `?region=europe&items=T4_BAG,T5_BAG`: 1–30 distinct item IDs, always normal quality. */
export const itemPricesQuery = z.object({
  region: regionSchema,
  items: z
    .string()
    .max(ITEM_PRICE_BATCH * 101)
    .transform((s) => s.split(","))
    .pipe(
      z
        .array(itemId)
        .min(1)
        .max(ITEM_PRICE_BATCH)
        .refine((ids) => new Set(ids).size === ids.length),
    ),
});

/** Every city's lowest sell order for an item, each with its own observation time. */
export const itemSellOrder = z.object({
  item: itemId,
  city: z.string().min(1).max(40),
  price: z.number().positive().max(Number.MAX_SAFE_INTEGER),
  observedAt: z.string().max(64),
});
export type ItemSellOrder = z.infer<typeof itemSellOrder>;

export const itemPricesResponse = z.object({
  region: regionSchema,
  quality: z.literal(1),
  fetchedAt: z.string().datetime(),
  source: z.literal("Albion Online Data Project"),
  orders: z.array(itemSellOrder).max(ITEM_PRICE_BATCH * 8),
});

/**
 * The cheapest sell order a player could buy now: the lowest fresh one (seen within the hour) in
 * any city but the Black Market. With no fresh order, the lowest stale one, flagged stale so it is
 * shown with its age and never as current. Null when no city has an order.
 */
export function cheapestSellOrder(orders: ItemSellOrder[], now = Date.now()) {
  let fresh: ItemSellOrder | null = null,
    stale: ItemSellOrder | null = null;
  for (const order of orders) {
    if (order.city === "Black Market" || !(order.price > 0)) continue;
    if (isStale(order.observedAt, now)) {
      if (!stale || order.price < stale.price) stale = order;
    } else if (!fresh || order.price < fresh.price) fresh = order;
  }
  const best = fresh ?? stale;
  return best ? { ...best, stale: !fresh } : null;
}

import { z } from "zod";
import { cities, regionSchema, type Region } from "./region-config";
import { isStale, sourceTimestamp } from "./freshness";

export const shoppingEntrySchema = z
  .object({
    itemId: z
      .string()
      .regex(/^[A-Z0-9_]+(?:@[1-4])?$/)
      .max(100),
    name: z.string().trim().min(1).max(120),
    city: z.enum(cities),
    quality: z.number().int().min(1).max(5),
    quantity: z.number().int().min(1).max(1000000),
    owned: z.number().int().min(0).max(1000000).default(0),
    unitPrice: z.number().finite().min(0).max(1000000000).nullable().default(null),
    priceKind: z.enum(["manual", "observed", "plan"]).default("manual"),
    observedAt: z.string().max(40).nullable().default(null),
  })
  .strict();
export type ShoppingEntry = z.infer<typeof shoppingEntrySchema>;
export const shoppingListSchema = z
  .object({
    version: z.literal(1),
    region: regionSchema,
    entries: z.array(shoppingEntrySchema).max(500),
  })
  .strict()
  .superRefine((list, ctx) => {
    const keys = list.entries.map(shoppingKey);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: "custom", message: "Duplicate shopping items" });
    if (
      list.entries.reduce(
        (sum, row) => sum + Math.max(0, row.quantity - row.owned) * (row.unitPrice ?? 0),
        0,
      ) > 1e12
    )
      ctx.addIssue({
        code: "custom",
        message: "Shopping totals must stay below one trillion silver",
      });
  });
export type ShoppingList = z.infer<typeof shoppingListSchema>;
export function shoppingKey(row: Pick<ShoppingEntry, "itemId" | "city" | "quality">) {
  return `${row.city}/${row.itemId}/${row.quality}`;
}
export function shoppingSummary(list: ShoppingList) {
  const parsed = shoppingListSchema.parse(list);
  const rows = parsed.entries.map((row) => {
    const buy = Math.max(0, row.quantity - row.owned);
    const stale =
      (row.priceKind === "observed" && (!row.observedAt || isStale(row.observedAt))) ||
      (row.priceKind === "plan" && !!row.observedAt && isStale(row.observedAt));
    const unavailableMarket = row.city === "Black Market";
    const cost =
      buy === 0
        ? 0
        : row.unitPrice === null ||
            stale ||
            unavailableMarket ||
            (row.unitPrice === 0 &&
              (row.priceKind === "observed" || (row.priceKind === "plan" && !!row.observedAt)))
          ? null
          : buy * row.unitPrice;
    return { ...row, buy, stale, cost, unavailableMarket };
  });
  const missing = rows.filter((row) => row.cost === null).length;
  return {
    rows,
    missing,
    complete: missing === 0,
    total: missing ? null : rows.reduce((sum, row) => sum + (row.cost ?? 0), 0),
    knownCost: rows.reduce((sum, row) => sum + (row.cost ?? 0), 0),
    remainingItems: rows.reduce((sum, row) => sum + row.buy, 0),
    ready: rows.filter((row) => row.buy === 0).length,
  };
}
export function mergeShopping(list: ShoppingList, incoming: ShoppingEntry[], region: Region) {
  if (list.region !== region)
    throw new Error("Choose the same server before combining shopping lists");
  const rows = new Map(list.entries.map((row) => [shoppingKey(row), row]));
  for (const input of incoming) {
    const row = shoppingEntrySchema.parse(input),
      key = shoppingKey(row),
      previous = rows.get(key);
    rows.set(key, previous ? { ...previous, quantity: previous.quantity + row.quantity } : row);
  }
  return shoppingListSchema.parse({ ...list, entries: [...rows.values()] });
}

export const savedShoppingSchema = z
  .object({
    kind: z.literal("shopping-list"),
    region: regionSchema,
    list: shoppingListSchema,
  })
  .strict()
  .superRefine((saved, ctx) => {
    if (saved.list.region !== saved.region)
      ctx.addIssue({ code: "custom", message: "A saved shopping list must use one server" });
    if (saved.list.entries.length > 100)
      ctx.addIssue({
        code: "custom",
        message: "Save up to 100 purchase lines in one account list",
      });
  });

/** A consolidated plan price is an estimate; retain the oldest contributing observation.
 * Returned materials are never presumed to be owned inventory. */
export function shoppingFromProduction(
  rows: {
    id: string;
    name: string;
    city: string;
    quality: number;
    quantity: number;
    gross: number | null;
    sources: ReadonlySet<string>;
  }[],
): ShoppingEntry[] {
  return rows.map((row) => {
    const dates = [...row.sources]
      .filter((source) => source.startsWith("Observed "))
      .map((source) => source.slice(9));
    const invalid = dates.find((date) => !Number.isFinite(sourceTimestamp(date)));
    const oldest =
      invalid ?? dates.sort((a, b) => sourceTimestamp(a) - sourceTimestamp(b))[0] ?? null;
    return shoppingEntrySchema.parse({
      itemId: row.id,
      name: row.name,
      city: row.city,
      quality: row.quality,
      quantity: row.quantity,
      owned: 0,
      unitPrice: row.gross === null ? null : row.gross / row.quantity,
      priceKind: "plan",
      observedAt: oldest,
    });
  });
}

/** Merge only requested, unchanged prices. Quantity/inventory edits remain independent. */
export function mergeShoppingQuotes(
  current: ShoppingList,
  requested: ShoppingEntry[],
  quotes: { itemId: string; quality: number; prices: import("./market-quotes").MarketPrice[] }[],
): ShoppingList {
  return {
    ...current,
    entries: current.entries.map((row) => {
      const original = requested.find((r) => shoppingKey(r) === shoppingKey(row));
      if (
        !original ||
        row.city === "Black Market" ||
        row.unitPrice !== original.unitPrice ||
        row.priceKind !== original.priceKind ||
        row.observedAt !== original.observedAt ||
        (row.priceKind === "manual" && row.unitPrice !== null)
      )
        return row;
      const quote = quotes.find((q) => q.itemId === row.itemId && q.quality === row.quality);
      const price = quote?.prices.find(
        (p) =>
          p.item_id === row.itemId &&
          p.quality === row.quality &&
          p.city === row.city &&
          p.sell_price_min > 0 &&
          !isStale(p.sell_price_min_date),
      );
      return price
        ? {
            ...row,
            unitPrice: price.sell_price_min,
            priceKind: "observed",
            observedAt: price.sell_price_min_date,
          }
        : row;
    }),
  };
}

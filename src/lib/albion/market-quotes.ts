import { z } from "zod";
import { regionSchema } from "./region-config";
export const marketPrice = z.object({
  item_id: z.string().min(3).max(100),
  city: z.string().min(1).max(100),
  quality: z.number().int().min(1).max(5),
  sell_price_min: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sell_price_min_date: z.string().max(64),
  buy_price_max: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
  buy_price_max_date: z.string().max(64),
});
export type MarketPrice = z.infer<typeof marketPrice>;
export const batchQuery = z.object({
  region: regionSchema,
  items: z
    .string()
    .max(1300)
    .transform((s) => s.split(","))
    .pipe(
      z
        .array(z.string().regex(/^[A-Z0-9_@]{3,100}$/))
        .min(1)
        .max(12)
        .refine((ids) => new Set(ids).size === ids.length),
    ),
  quality: z.coerce.number().int().min(1).max(5),
});
export const quoteResponse = z.object({
  region: regionSchema,
  fetchedAt: z.string().datetime(),
  source: z.literal("Albion Online Data Project"),
  prices: z.array(marketPrice).max(10000),
});
export type QuoteSelection = { itemId: string; quality: number };
/** One bounded request per quality; identities are checked again at the browser boundary. */
export async function fetchQuoteBatch(
  region: string,
  items: QuoteSelection[],
  signal: AbortSignal,
) {
  const unique = [...new Map(items.map((i) => [`${i.itemId}:${i.quality}`, i])).values()];
  if (!unique.length || unique.length > 100) throw new Error("Choose 1–100 items.");
  const result: { itemId: string; quality: number; prices: MarketPrice[]; error?: string }[] = [];
  // Sequential chunks bound upstream concurrency and isolate a failed quality batch.
  for (const quality of [...new Set(unique.map((i) => i.quality))]) {
    const group = unique.filter((i) => i.quality === quality);
    for (let offset = 0; offset < group.length; offset += 12) {
      const chunk = group.slice(offset, offset + 12);
      try {
        const response = await fetch(
          `/api/market/batch?${new URLSearchParams({ region, items: chunk.map((i) => i.itemId).join(","), quality: String(quality) })}`,
          { signal },
        );
        if (!response.ok) throw new Error("Quote refresh failed. Retry shortly.");
        const data = quoteResponse.parse(await response.json());
        if (
          data.region !== region ||
          data.prices.some(
            (p) => p.quality !== quality || !chunk.some((i) => i.itemId === p.item_id),
          )
        )
          throw new Error("Quote identity mismatch. Retry shortly.");
        result.push(
          ...chunk.map((i) => ({
            ...i,
            prices: data.prices.filter((p) => p.item_id === i.itemId),
          })),
        );
      } catch (error) {
        if (signal.aborted) throw error;
        result.push(
          ...chunk.map((i) => ({
            ...i,
            prices: [],
            error: error instanceof Error ? error.message : "Quote refresh failed.",
          })),
        );
      }
    }
  }
  return result;
}

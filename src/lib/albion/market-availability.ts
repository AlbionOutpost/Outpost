import { z } from "zod";
import { cities, regionSchema } from "./region-config";
import type { MarketPrice } from "./market-quotes";

export const qualityAvailabilityQuery = z.object({
  region: regionSchema,
  item: z.string().regex(/^[A-Z0-9_@]{3,100}$/),
  city: z.enum(cities).optional(),
});
export const qualityAvailabilityResponse = z.object({
  region: regionSchema,
  item: z.string().regex(/^[A-Z0-9_@]{3,100}$/),
  city: z.enum(cities).nullable(),
  fetchedAt: z.string().datetime(),
  source: z.literal("Albion Online Data Project"),
  qualities: z
    .array(
      z.object({
        quality: z.number().int().min(1).max(5),
        sell: z.number().positive().nullable(),
        sellCity: z.enum(cities).nullable(),
        sellObservedAt: z.string().max(64).nullable(),
        buy: z.number().positive().nullable(),
        buyCity: z.enum(cities).nullable(),
        buyObservedAt: z.string().max(64).nullable(),
      }),
    )
    .length(5)
    .refine((rows) => rows.every((row, index) => row.quality === index + 1)),
});
/** Alternatives retain their own exact quality, city and source date. Never substitute a quote. */
export function summariseQualityAvailability(
  rows: MarketPrice[],
  item: string,
  city?: (typeof cities)[number],
) {
  return [1, 2, 3, 4, 5].map((quality) => {
    const matching = rows.filter(
      (row) =>
        row.item_id === item &&
        row.quality === quality &&
        cities.includes(row.city as (typeof cities)[number]) &&
        (!city || row.city === city),
    );
    const sell = matching
      .filter((row) => row.city !== "Black Market" && row.sell_price_min > 0)
      .sort((a, b) => a.sell_price_min - b.sell_price_min)[0];
    const buy = matching
      .filter((row) => row.buy_price_max > 0)
      .sort((a, b) => b.buy_price_max - a.buy_price_max)[0];
    return {
      quality,
      sell: sell?.sell_price_min ?? null,
      sellCity: (sell?.city as (typeof cities)[number]) ?? null,
      sellObservedAt: sell?.sell_price_min_date || null,
      buy: buy?.buy_price_max ?? null,
      buyCity: (buy?.city as (typeof cities)[number]) ?? null,
      buyObservedAt: buy?.buy_price_max_date || null,
    };
  });
}

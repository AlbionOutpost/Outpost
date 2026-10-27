import { z } from "zod";
import { type Region } from "./region-config";
import { requestData } from "./data-client";
const price = z.object({
  item_id: z.string().min(3).max(100),
  city: z.string().min(1).max(100),
  quality: z.number().int().min(1).max(5),
  sell_price_min: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sell_price_min_date: z.string().max(64),
  buy_price_max: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
  buy_price_max_date: z.string().max(64),
});
export type MarketPrice = z.infer<typeof price>;
export { isStale } from "./freshness";
export async function getPrices(region: Region, items: string[], quality: number) {
  if (
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 5 ||
    !items.length ||
    items.length > 50 ||
    items.some((id) => !/^[A-Z0-9_@]{3,100}$/.test(id))
  )
    throw new Error("Invalid item batch");
  const uniqueItems = [...new Set(items)].sort();
  return requestData(
    region,
    `/api/v2/stats/prices/${uniqueItems.join(",")}.json?qualities=${quality}`,
    z
      .array(price)
      .max(10000)
      .refine(
        (rows) => rows.every((row) => uniqueItems.includes(row.item_id) && row.quality === quality),
        "Unexpected item or quality in source response",
      ),
  );
}

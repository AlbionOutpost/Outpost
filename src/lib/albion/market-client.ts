import { z } from "zod";
import { type Region } from "./region-config";
import { requestData } from "./data-client";
import { marketPrice as price } from "./market-quotes";
export type { MarketPrice } from "./market-quotes";
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

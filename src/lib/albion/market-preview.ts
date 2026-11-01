import { z } from "zod";
import { regionSchema, cities, type Region } from "./region-config";
import { sourceTimestamp, isStale } from "./freshness";

const previewResponse = z.object({
  region: regionSchema,
  prices: z
    .array(
      z.object({
        item_id: z.string().min(3).max(100),
        city: z.enum(cities),
        quality: z.number().int().min(1).max(5),
        sell_price_min: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
        sell_price_min_date: z.string().max(64),
        buy_price_max: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
        buy_price_max_date: z.string().max(64),
      }),
    )
    .max(100),
});

export function parseMarketPreview(value: unknown, region: Region, item: string) {
  const data = previewResponse.parse(value);
  if (
    data.region !== region ||
    data.prices.some((row) => row.item_id !== item || row.quality !== 1)
  )
    throw new Error("Observation identity mismatch");
  if (new Set(data.prices.map((row) => row.city)).size !== data.prices.length)
    throw new Error("Duplicate city observations");
  return data.prices.toSorted((a, b) => a.city.localeCompare(b.city));
}

export type PreviewPrice = ReturnType<typeof parseMarketPreview>[number];

export function observationLabel(value: number, date: string, now = Date.now()) {
  const stamp = sourceTimestamp(date);
  if (!value) return { label: "Unavailable", dateTime: null };
  if (!Number.isFinite(stamp) || stamp <= 0 || date.startsWith("0001"))
    return { label: "Time unknown", dateTime: null };
  const dateTime = new Date(stamp).toISOString();
  return {
    label: stamp - now > 300000 ? "Time uncertain" : isStale(date, now) ? "Stale" : "Recent",
    dateTime,
  };
}

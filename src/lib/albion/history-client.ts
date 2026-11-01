import { z } from "zod";
import { requestData } from "./data-client";
import { type Region, cities } from "./region-config";
const timestamp = z
  .string()
  .refine((s) => Number.isFinite(Date.parse(s)), "Invalid source timestamp");
const gold = z.array(z.object({ price: z.number().nonnegative(), timestamp })).max(1000);
const history = z
  .array(
    z.object({
      location: z.string(),
      item_id: z.string(),
      quality: z.number().int(),
      data: z
        .array(
          z.object({
            item_count: z.number().nonnegative(),
            avg_price: z.number().nonnegative(),
            timestamp,
          }),
        )
        .max(1000),
    }),
  )
  .max(100);
export async function getGold(region: Region) {
  return requestData(region, "/api/v2/stats/gold.json?count=168", gold, 300);
}
export async function getHistory(
  region: Region,
  item: string,
  city: (typeof cities)[number],
  quality: number,
) {
  z.string()
    .regex(/^[A-Z0-9_@]{3,100}$/)
    .parse(item);
  z.enum(cities).parse(city);
  z.number().int().min(1).max(5).parse(quality);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);
  const query = new URLSearchParams({
    locations: city,
    qualities: String(quality),
    date: start,
    end_date: end,
    "time-scale": "24",
  });
  const data = await requestData(
    region,
    `/api/v2/stats/history/${item}.json?${query}`,
    history,
    300,
  );
  return data.filter(
    (row) => row.item_id === item && row.location === city && row.quality === quality,
  );
}

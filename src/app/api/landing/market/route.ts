import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { getPrices } from "@/lib/albion/market-client";
import { getWeekHistory } from "@/lib/albion/history-client";
import { regionSchema, cities } from "@/lib/albion/region-config";

/** Items the landing market strip may quote; the Market Explorer takes any item. */
const stripItems = new Set([
  "T6_MAIN_AXE",
  "T6_METALBAR",
  "T6_MOUNT_OX",
  "T6_POTION_HEAL",
  "T4_SKILLBOOK_STANDARD",
  "T6_PLANKS",
  "T4_BAG",
  "T6_2H_BOW",
]);

/**
 * Current sell quote plus the last seven daily averages for up to five items in one city, in
 * two source requests. Every quote keeps its own timestamp; a missing item stays missing.
 */
export const GET = apiHandler("landing.market", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      city: z.enum(cities),
      items: z.string().max(200),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const items = [...new Set(v.items.split(",").filter(Boolean))];
  if (!items.length || items.length > 5 || items.some((i) => !stripItems.has(i)))
    throw new HttpError(400, "Unsupported strip items");
  if (v.city === "Black Market") throw new HttpError(400, "Unsupported city");
  const [prices, week] = await Promise.all([
    getPrices(v.region, items, 1),
    getWeekHistory(v.region, items, v.city).catch(() => new Map<string, never[]>()),
  ]);
  return NextResponse.json({
    region: v.region,
    city: v.city,
    fetchedAt: new Date().toISOString(),
    source: "Albion Online Data Project",
    items: items.map((id) => {
      const row = prices.find((p) => p.item_id === id && p.quality === 1 && p.city === v.city);
      const days = (week.get(id) ?? []).map((d) => ({ avg: d.avg_price, at: d.timestamp }));
      const first = days[0]?.avg;
      const last = days.at(-1)?.avg;
      return {
        id,
        sell: row?.sell_price_min || null,
        observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
        days,
        // Change over the observed week; null unless both ends were observed.
        change: first && last ? (last - first) / first : null,
      };
    }),
  });
});

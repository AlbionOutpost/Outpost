import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { getPrices } from "@/lib/albion/market-client";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { journalId, laborerLoot, laborerTypes } from "@/lib/albion/laborers";
import { itemName } from "@/lib/albion/game/server-recipes";
/** Observations for one laborer run: full journal (buy), empty journal and loot (sale side). */
export const GET = apiHandler("laborers.prices", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      type: z.enum(laborerTypes),
      journalTier: z.coerce.number().int().min(4).max(8),
      journalCity: z.enum(cities),
      lootCity: z.enum(cities),
      saleMode: z.enum(["instant", "listing"]),
      buyOrder: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  if (v.journalCity === "Black Market" || v.lootCity === "Black Market")
    throw new HttpError(400, "The Black Market does not trade journals or resources");
  const loot = laborerLoot(v.type, v.journalTier);
  if (!loot) throw new HttpError(400, "Unsupported journal tier");
  const full = journalId(v.type, v.journalTier, true);
  const empty = journalId(v.type, v.journalTier, false);
  const rows = await getPrices(v.region, [full, empty, ...loot.items.map((i) => i.id)], 1);
  const observe = (id: string, city: string, side: "buy" | "sale") => {
    const row = rows.find((r) => r.item_id === id && r.city === city && r.quality === 1);
    // Buy orders and instant sales use the bid; instant purchases and listings use the ask.
    const bid = side === "buy" ? v.buyOrder : v.saleMode === "instant";
    const execution =
      side === "buy"
        ? v.buyOrder
          ? "buy-order"
          : "instant-purchase"
        : v.saleMode === "instant"
          ? "instant-sale"
          : "listing";
    const value = (bid ? row?.buy_price_max : row?.sell_price_min) || null;
    return {
      value,
      observedAt: value ? (bid ? row!.buy_price_max_date : row!.sell_price_min_date) : null,
      execution,
      manual: false,
      region: v.region,
      city,
      quality: 1,
    };
  };
  return NextResponse.json({
    source: "Albion Online Data Project",
    names: Object.fromEntries(
      [full, empty, ...loot.items.map((i) => i.id)].map((id) => [id, itemName(id)]),
    ),
    prices: {
      [full]: observe(full, v.journalCity, "buy"),
      [empty]: observe(empty, v.lootCity, "sale"),
      ...Object.fromEntries(loot.items.map((i) => [i.id, observe(i.id, v.lootCity, "sale")])),
    },
  });
});

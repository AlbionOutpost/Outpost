import { NextRequest, NextResponse } from "next/server";
import { getPrices } from "@/lib/albion/market-client";
import { isSupportedMarketItem } from "@/lib/albion/market-supported";
import { cities } from "@/lib/albion/region-config";
import { ITEM_PRICE_BATCH, itemPricesQuery } from "@/lib/albion/item-prices";

const buyable = new Set<string>(cities.filter((c) => c !== "Black Market"));

/** The item database's price line: every city's sell order for one page of items, normal quality,
 * in one AODP batch. The page picks the cheapest fresh one; nothing is substituted. */
export async function GET(req: NextRequest) {
  const parsed = itemPricesQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success || parsed.data.items.some((id) => !isSupportedMarketItem(id)))
    return NextResponse.json(
      { error: `Choose a server and up to ${ITEM_PRICE_BATCH} distinct catalog items.` },
      { status: 400 },
    );
  try {
    const { region, items } = parsed.data;
    const rows = await getPrices(region, items, 1);
    const orders = rows
      .filter((r) => r.quality === 1 && r.sell_price_min > 0 && buyable.has(r.city))
      .map((r) => ({
        item: r.item_id,
        city: r.city,
        price: r.sell_price_min,
        observedAt: r.sell_price_min_date,
      }))
      // One answer for any order of the same items, so the edge can key it by the sorted set.
      .sort((a, b) =>
        a.item === b.item ? a.city.localeCompare(b.city) : a.item < b.item ? -1 : 1,
      );
    return NextResponse.json({
      region,
      quality: 1,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      orders,
    });
  } catch {
    return NextResponse.json(
      { error: "Market observations unavailable. No prices substituted." },
      { status: 503 },
    );
  }
}

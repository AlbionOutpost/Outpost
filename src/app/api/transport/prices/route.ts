import { NextRequest, NextResponse } from "next/server";
import { transportBase } from "@/lib/albion/transport";
import { transportObservations } from "@/lib/albion/transport-prices";
import { getPrices } from "@/lib/albion/market-client";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { requireSupportedMarketItems } from "@/lib/albion/market-supported";
export const GET = apiHandler("transport.prices", async (req: NextRequest) => {
  const v = transportBase
    .pick({
      region: true,
      itemId: true,
      quality: true,
      fromCity: true,
      toCity: true,
      saleMode: true,
    })
    .parse({
      ...Object.fromEntries(req.nextUrl.searchParams),
      quality: Number(req.nextUrl.searchParams.get("quality")),
    });
  if (v.fromCity === "Black Market") throw new HttpError(400, "Choose a player purchase market");
  requireSupportedMarketItems([v.itemId]);
  return NextResponse.json(
    transportObservations(v, await getPrices(v.region, [v.itemId], v.quality)),
  );
});

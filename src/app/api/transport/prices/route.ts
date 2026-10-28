import { NextRequest, NextResponse } from "next/server";
import { transportBase } from "@/lib/albion/transport";
import { transportObservations } from "@/lib/albion/transport-prices";
import { getPrices } from "@/lib/albion/market-client";
import { rateLimit } from "@/lib/redis";
import { apiHandler, HttpError } from "@/lib/api-errors";
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
  if (!(await rateLimit("transport-prices", 60, 60)))
    throw new HttpError(429, "Price request budget exhausted");
  return NextResponse.json(
    transportObservations(v, await getPrices(v.region, [v.itemId], v.quality)),
  );
});

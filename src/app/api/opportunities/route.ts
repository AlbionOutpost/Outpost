import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { transportBase, initialTransport, transport } from "@/lib/albion/transport";
import { transportObservations } from "@/lib/albion/transport-prices";
import { getPrices } from "@/lib/albion/market-client";
import { rateLimit } from "@/lib/redis";
export const GET = apiHandler("opportunities.scan", async (req: NextRequest) => {
  const p = Object.fromEntries(req.nextUrl.searchParams);
  const v = transportBase
    .pick({ region: true, fromCity: true, toCity: true, saleMode: true })
    .extend({
      quality: z.coerce.number().int().min(1).max(5),
      tax: z.coerce.number().min(0).max(100),
      fee: z.coerce.number().min(0).max(100),
      items: z
        .string()
        .max(2600)
        .transform((s) => s.split(","))
        .pipe(z.array(transportBase.shape.itemId).min(1).max(25)),
    })
    .parse(p);
  if (v.toCity === "Black Market" && v.saleMode === "listing")
    throw new HttpError(400, "Black Market scenarios use observed buy orders only");
  if (!(await rateLimit("opportunities", 30, 60)))
    throw new HttpError(429, "Scanner budget exhausted; retry later");
  const items = [...new Set(v.items)],
    observations = await getPrices(v.region, items, v.quality);
  return NextResponse.json({
    region: v.region,
    observedAt: new Date().toISOString(),
    rows: items
      .map((itemId) => {
        const input = { ...initialTransport(v.region), ...v, itemId },
          prices = transportObservations(input, observations);
        return { itemId, ...prices, ...transport({ ...input, ...prices }) };
      })
      .sort((a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity)),
    methodology:
      "One item per estimate, immediate purchase at observed minimum sell order; destination buy maximum for immediate sale or minimum sell order for listing estimates. Tax and listing fee are manual. No liquidity, order volume, execution probability or transport risk is inferred.",
  });
});

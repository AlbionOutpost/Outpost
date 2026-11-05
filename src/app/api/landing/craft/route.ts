import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { regionSchema } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
import { landingCraftItems, landingCraftQuote } from "@/lib/landing-craft";

/** The landing crafting showcase on its own (`/api/landing` carries the same quote). */
export const GET = apiHandler("landing.craft", async (req: NextRequest) => {
  const v = z
    .object({
      region: regionSchema,
      batches: z.coerce.number().int().min(1).max(50).default(1),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await getPrices(v.region, landingCraftItems(), 1);
  return NextResponse.json(landingCraftQuote(v.region, v.batches, rows));
});

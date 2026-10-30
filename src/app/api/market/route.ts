import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema } from "@/lib/albion/region-config";
import { getPrices } from "@/lib/albion/market-client";
const query = z.object({
  region: regionSchema,
  item: z.string().regex(/^[A-Z0-9_@]{3,100}$/),
  quality: z.coerce.number().int().min(1).max(5),
});
export async function GET(req: NextRequest) {
  const result = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!result.success)
    return NextResponse.json({ error: "Invalid region, item ID or quality" }, { status: 400 });
  try {
    const { region, item, quality } = result.data;
    return NextResponse.json({
      region,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      prices: await getPrices(region, [item], quality),
    });
  } catch {
    return NextResponse.json(
      { error: "Market data is unavailable. No prices have been substituted." },
      { status: 503 },
    );
  }
}

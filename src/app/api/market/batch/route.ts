import { NextRequest, NextResponse } from "next/server";
import { batchQuery } from "@/lib/albion/market-quotes";
import { getPrices } from "@/lib/albion/market-client";
export async function GET(req: NextRequest) {
  const parsed = batchQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose up to 12 distinct items, a region and quality." },
      { status: 400 },
    );
  try {
    const { region, items, quality } = parsed.data;
    return NextResponse.json({
      region,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      prices: await getPrices(region, items, quality),
    });
  } catch {
    return NextResponse.json(
      { error: "Market observations unavailable. No prices substituted." },
      { status: 503 },
    );
  }
}

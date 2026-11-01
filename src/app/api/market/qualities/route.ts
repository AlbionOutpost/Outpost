import { NextRequest, NextResponse } from "next/server";
import {
  qualityAvailabilityQuery,
  qualityAvailabilityResponse,
  summariseQualityAvailability,
} from "@/lib/albion/market-availability";
import { getPrices } from "@/lib/albion/market-client";

export async function GET(req: NextRequest) {
  const parsed = qualityAvailabilityQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a valid server, item and city." }, { status: 400 });
  try {
    const { region, item, city } = parsed.data;
    const rows = await getPrices(region, [item], [1, 2, 3, 4, 5]);
    const body = qualityAvailabilityResponse.parse({
      region,
      item,
      city: city ?? null,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      qualities: summariseQualityAvailability(rows, item, city),
    });
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return NextResponse.json(
      { error: "Quality observations are unavailable. Your selected quality is unchanged." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}

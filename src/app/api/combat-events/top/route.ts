import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema } from "@/lib/albion/region-config";
import { pricedTopKills } from "@/lib/albion/priced-top-kills";

/** The week's three highest-value kills on a server (`/api/landing` carries the same feed). */
export async function GET(req: NextRequest) {
  const parsed = z
    .object({ region: regionSchema })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a valid server." }, { status: 400 });
  try {
    return NextResponse.json(await pricedTopKills(parsed.data.region), {
      headers: { "Cache-Control": "public, max-age=120" },
    });
  } catch {
    return NextResponse.json(
      { error: "Albion’s kill feed is unavailable right now." },
      { status: 503 },
    );
  }
}

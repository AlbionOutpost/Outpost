import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema } from "@/lib/albion/region-config";
import { getCombatEvents } from "@/lib/albion/combat-events";
import { rateLimit } from "@/lib/redis";
const query = z
  .object({
    region: regionSchema,
    offset: z.coerce.number().int().min(0).max(200).multipleOf(20).default(0),
  })
  .strict();
export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a valid server and feed page." }, { status: 400 });
  if (!(await rateLimit("combat-public", 120, 60)))
    return NextResponse.json(
      { error: "The feed request budget is busy. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
    );
  try {
    const data = await getCombatEvents(parsed.data.region, parsed.data.offset);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=15" } });
  } catch {
    return NextResponse.json(
      { error: "Albion’s combat feed is unavailable. Your filters are kept; retry shortly." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "45" } },
    );
  }
}

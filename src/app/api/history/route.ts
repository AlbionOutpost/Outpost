import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { regionSchema, cities } from "@/lib/albion/region-config";
import { getGold, getHistory } from "@/lib/albion/history-client";
const query = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("gold"), region: regionSchema }),
  z.object({
    kind: z.literal("history"),
    region: regionSchema,
    item: z.string().regex(/^[A-Z0-9_@]{3,100}$/),
    city: z.enum(cities),
    quality: z.coerce.number().int().min(1).max(5),
  }),
]);
export async function GET(req: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid history request" }, { status: 400 });
  try {
    const p = parsed.data;
    const data =
      p.kind === "gold"
        ? await getGold(p.region)
        : await getHistory(p.region, p.item, p.city, p.quality);
    return NextResponse.json({
      region: p.region,
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      data,
    });
  } catch {
    return NextResponse.json(
      { error: "Historical observations are unavailable. No data has been substituted." },
      { status: 503 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { canReadBuild } from "@/lib/builds/validation";
import { getPrices } from "@/lib/albion/market-client";
import { cities, regionSchema } from "@/lib/albion/region-config";
import { isStale } from "@/lib/albion/freshness";
import { rateLimit } from "@/lib/redis";
export const GET = apiHandler(
  "build.cost",
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await getServerSession(authOptions);
    const build = await db.build.findUnique({
      where: { id: (await ctx.params).id },
      include: { equipment: true },
    });
    if (
      !build ||
      (build.hiddenAt && build.authorId !== user?.user?.id) ||
      !canReadBuild(build.visibility, build.authorId, user?.user?.id)
    )
      throw new HttpError(404, "Build not found");
    const q = z
      .object({
        region: regionSchema,
        city: z.enum(cities),
        sets: z.coerce.number().int().min(1).max(1000),
      })
      .parse(Object.fromEntries(req.nextUrl.searchParams));
    if (!(await rateLimit("build-cost-public", 60, 60)))
      throw new HttpError(429, "Price request budget exhausted. Retry later.");
    const prices = (
      await Promise.all(
        [...new Set(build.equipment.map((e) => e.quality))].map((quality) =>
          getPrices(
            q.region,
            [...new Set(build.equipment.filter((e) => e.quality === quality).map((e) => e.itemId))],
            quality,
          ),
        ),
      )
    ).flat();
    const rows = build.equipment.map((e) => {
      const p = prices.find(
        (p) => p.item_id === e.itemId && p.quality === e.quality && p.city === q.city,
      );
      return {
        slot: e.slot,
        itemId: e.itemId,
        quality: e.quality,
        price: p?.sell_price_min || null,
        observedAt: p?.sell_price_min ? p.sell_price_min_date : null,
        stale: p?.sell_price_min ? isStale(p.sell_price_min_date) : false,
      };
    });
    const knownCost = rows.reduce((sum, r) => sum + (r.price || 0) * q.sets, 0);
    return NextResponse.json({
      region: q.region,
      city: q.city,
      sets: q.sets,
      source: "Albion Online Data Project",
      fetchedAt: new Date().toISOString(),
      rows,
      knownCost,
      total: rows.some((r) => r.price === null) ? null : knownCost,
      stale: rows.some((r) => r.stale),
    });
  },
);

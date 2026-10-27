import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { apiHandler, HttpError } from "@/lib/api-errors";
const tools = [
  ["Market explorer", "market"],
  ["Crafting profit", "crafting"],
  ["Refining profit", "refining"],
  ["Enchanting costs", "enchanting"],
  ["Transport planner", "transporting"],
  ["Trade profit and opportunity scanner", "flipping"],
  ["Gold history", "gold"],
];
export const GET = apiHandler("search.global", async (req: NextRequest) => {
  const q = z.string().trim().min(2).max(100).parse(req.nextUrl.searchParams.get("q"));
  if (!(await rateLimit("global-search", 120, 60)))
    throw new HttpError(429, "Search budget exhausted; retry shortly");
  const s = await getServerSession(authOptions),
    userId = s?.user?.id;
  const [items, builds, compositions, groups] = await Promise.all([
    db.itemMetadata.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, name: true },
    }),
    db.build.findMany({
      where: {
        hiddenAt: null,
        title: { contains: q, mode: "insensitive" },
        OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ authorId: userId }] : [])],
      },
      take: 8,
      select: { id: true, title: true },
    }),
    db.composition.findMany({
      where: {
        hiddenAt: null,
        title: { contains: q, mode: "insensitive" },
        OR: [
          { visibility: "PUBLIC" },
          ...(userId
            ? [
                { visibility: "PRIVATE" as const, authorId: userId },
                { visibility: "GROUP" as const, group: { members: { some: { userId } } } },
              ]
            : []),
        ],
      },
      take: 8,
      select: { id: true, title: true },
    }),
    db.group.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ members: { some: { userId } } }] : [])],
      },
      take: 8,
      select: { slug: true, name: true },
    }),
  ]);
  return NextResponse.json({
    results: [
      ...tools
        .filter(([title]) => title.toLowerCase().includes(q.toLowerCase()))
        .map(([title, slug]) => ({ category: "Tools", title, url: `/tools/${slug}` })),
      ...items.map((i) => ({
        category: "Items",
        title: i.name,
        url: `/items/${encodeURIComponent(i.id)}`,
      })),
      ...builds.map((b) => ({ category: "Builds", title: b.title, url: `/builds/${b.id}` })),
      ...compositions.map((c) => ({
        category: "Compositions",
        title: c.title,
        url: `/compositions/${c.id}`,
      })),
      ...groups.map((g) => ({ category: "Groups", title: g.name, url: `/groups/${g.slug}` })),
    ],
  });
});

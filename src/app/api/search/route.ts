import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { tools } from "@/lib/tool-directory";
import { queryLibraryBuilds, queryLibraryCompositions, libraryGuides } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { familyName, familyScore, matchScore, terms } from "@/lib/search-rank";
type Row = { category: string; title: string; url: string; subtitle?: string; icon?: string };
const best = <T>(rows: readonly T[], score: (row: T) => number, take: number) =>
  rows
    .map((row) => ({ row, score: score(row) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((r) => r.row);
export const GET = apiHandler("search.global", async (req: NextRequest) => {
  const q = z.string().trim().min(2).max(100).parse(req.nextUrl.searchParams.get("q"));
  if (!(await rateLimit("global-search", 600, 60)))
    throw new HttpError(429, "Search is busy; retry in a moment");
  const { words, compact } = terms(q);
  if (!words.length) return NextResponse.json({ results: [] });
  const enchant = /(?:@|\.)([1-4])\b/.exec(q)?.[1];
  const nameWords = words.filter((w) => !/^(?:@|\.)?[1-4]$|^t[1-8]$/.test(w));
  const tier = /\bt([1-8])\b/i.exec(q)?.[1];
  const s = await getServerSession(authOptions),
    userId = s?.user?.id;
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const [items, builds, compositions, groups, library, libraryComps] = await Promise.all([
    nameWords.length
      ? db.itemMetadata.findMany({
          where: {
            active: true,
            enchantment: enchant ? Number(enchant) : 0,
            ...(tier ? { tier: Number(tier) } : {}),
            OR: [
              { AND: nameWords.map((w) => ({ name: contains(w) })) },
              { name: contains(nameWords.join("")) },
              { id: contains(q.replace(/\s+/g, "_")) },
            ],
          },
          take: 120,
          select: { id: true, name: true, tier: true, slot: true },
        })
      : [],
    db.build.findMany({
      where: {
        hiddenAt: null,
        AND: words.map((w) => ({ title: contains(w) })),
        OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ authorId: userId }] : [])],
      },
      take: 6,
      select: { id: true, title: true },
    }),
    db.composition.findMany({
      where: {
        hiddenAt: null,
        AND: words.map((w) => ({ title: contains(w) })),
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
      take: 6,
      select: { id: true, title: true },
    }),
    db.group.findMany({
      where: {
        AND: words.map((w) => ({ name: contains(w) })),
        OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ members: { some: { userId } } }] : [])],
      },
      take: 6,
      select: { slug: true, name: true },
    }),
    Promise.resolve(queryLibraryBuilds({ q: words.join(" ") })).then(async (page) =>
      page.matched || words.length < 2 ? page : queryLibraryBuilds({ q: compact }),
    ),
    Promise.resolve(queryLibraryCompositions({ q: words.join(" ") })),
  ]);
  // One row per item family ("Battleaxe"), linked to its lowest matching tier.
  const families = new Map<
    string,
    { id: string; name: string; tiers: number[]; slot: string; score: number }
  >();
  for (const item of items) {
    const name = familyName(item.name);
    const score = familyScore(item.name, nameWords.join(" "));
    if (!score) continue;
    const existing = families.get(name);
    if (!existing)
      families.set(name, { id: item.id, name, tiers: [item.tier], slot: item.slot, score });
    else {
      if (item.tier < Math.min(...existing.tiers)) existing.id = item.id;
      existing.tiers.push(item.tier);
      existing.score = Math.max(existing.score, score);
    }
  }
  const top = Math.max(0, ...[...families.values()].map((f) => f.score));
  const itemRows: Row[] = [...families.values()]
    // Drop weak substring hits ("Cabbage" for "bag") when strong matches exist.
    .filter((f) => f.score >= top / 2)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((f) => {
      const tiers = [...new Set(f.tiers)].sort((a, b) => a - b);
      return {
        category: "Items",
        title: enchant ? `${f.name} .${enchant}` : f.name,
        subtitle: `${f.slot} · ${tiers.length > 1 ? `T${tiers[0]}–T${tiers.at(-1)}` : `T${tiers[0]}`}`,
        url: `/items/${encodeURIComponent(f.id)}`,
        icon: f.id,
      };
    });
  const toolScore = (t: (typeof tools)[number]) =>
    Math.max(matchScore(t.title, q), matchScore(t.short, q), matchScore(t.description, q) / 3);
  const toolTop = Math.max(0, ...tools.map(toolScore));
  const toolRows: Row[] = best(tools, toolScore, 4).map((t) => ({
    category: "Tools",
    title: t.title,
    subtitle: t.description,
    url: t.href,
  }));
  // Rank archive matches by title and weapon so an author name alone does not win.
  const libraryRows: Row[] = best(
    library.rows,
    (b) =>
      Math.max(matchScore(b.title, q), matchScore(b.weaponName, q) - 10) -
      (/\(copy\)/i.test(b.title) ? 20 : 0),
    6,
  ).map((b) => ({
    category: "Builds",
    title: b.title,
    subtitle: `${activityName(b.category)} · ${b.weaponName || "Build"} · ${b.author}`,
    url: `/builds/library/${b.slug}`,
    icon: b.equipment.find((e) => e.slot === "Main hand")?.itemId,
  }));
  const guideRows: Row[] = best(
    await Promise.resolve(libraryGuides()),
    (g) => Math.max(matchScore(g.title, q), matchScore(g.summary, q) / 2),
    4,
  ).map((g) => ({
    category: "Guides",
    title: g.title,
    subtitle: g.summary,
    url: `/guides/${g.slug}`,
  }));
  return NextResponse.json({
    // A tool whose name matches at least as well as any item is the likely destination.
    results: [
      ...(toolTop >= top ? [...toolRows, ...itemRows] : [...itemRows, ...toolRows]),
      ...builds.map((b) => ({ category: "Builds", title: b.title, url: `/builds/${b.id}` })),
      ...libraryRows,
      ...compositions.map((c) => ({
        category: "Compositions",
        title: c.title,
        url: `/compositions/${c.id}`,
      })),
      ...best(libraryComps.rows, (c) => matchScore(c.title, q), 4).map((c) => ({
        category: "Compositions",
        title: c.title,
        subtitle: `${activityName(c.category)} · ${c.members.length} players · ${c.author}`,
        url: `/compositions/library/${c.slug}`,
      })),
      ...guideRows,
      ...groups.map((g) => ({ category: "Groups", title: g.name, url: `/groups/${g.slug}` })),
    ] satisfies Row[],
  });
});

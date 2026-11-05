import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/api-errors";
import { db } from "@/lib/db";
import { findLibraryBuild, findLibraryComposition } from "@/lib/grind-library";
import { libraryLikeTarget } from "@/lib/library-likes";

/** At most ten `kind:slug` entries, each listed once. */
const query = z.object({
  items: z
    .string()
    .max(2100)
    .transform((s) => s.split(","))
    .pipe(
      z
        .array(
          z
            .string()
            .transform((entry) => {
              const at = entry.indexOf(":");
              return { kind: entry.slice(0, at), slug: entry.slice(at + 1) };
            })
            .pipe(libraryLikeTarget),
        )
        .min(1)
        .max(10)
        .refine((list) => new Set(list.map((t) => `${t.kind}:${t.slug}`)).size === list.length),
    ),
});

/**
 * Like counts for several library entries in one read — one session lookup and one database
 * round trip however many chips a page shows. Each entry is keyed by the `kind:slug` asked for;
 * an entry that is not in the public library answers `{ found: false }` and nothing else.
 */
export const GET = apiHandler("library-likes.read-many", async (req: NextRequest) => {
  const { items } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const resolved = await Promise.all(
    items.map(async (t) => {
      const item =
        t.kind === "build" ? await findLibraryBuild(t.slug) : await findLibraryComposition(t.slug);
      return {
        key: `${t.kind}:${t.slug}`,
        target: item ? { kind: t.kind, slug: item.slug } : null,
        archivedCount: item?.upvotes ?? 0,
      };
    }),
  );
  const targets = resolved.flatMap((r) => (r.target ? [r.target] : []));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  // One database round trip: a count per entry plus this account's likes among them
  // (at most eleven queries, inside the private database's twenty-per-batch limit).
  const answers = targets.length
    ? await db.$transaction([
        ...targets.map((where) => db.libraryLike.count({ where })),
        db.libraryLike.findMany({
          where: { userId: { in: userId ? [userId] : [] }, OR: targets },
          select: { kind: true, slug: true },
        }),
      ])
    : [];
  const counts = answers.slice(0, targets.length) as number[];
  const mine = (answers[targets.length] ?? []) as { kind: string; slug: string }[];
  const same = (a: { kind: string; slug: string }, b: { kind: string; slug: string }) =>
    a.kind === b.kind && a.slug === b.slug;
  return NextResponse.json({
    signedIn: !!userId,
    items: Object.fromEntries(
      resolved.map(({ key, target, archivedCount }) => {
        if (!target) return [key, { found: false }];
        const outpostCount = counts[targets.indexOf(target)] ?? 0;
        return [
          key,
          {
            found: true,
            archivedCount,
            outpostCount,
            count: archivedCount + outpostCount,
            liked: mine.some((m) => same(m, target)),
          },
        ];
      }),
    ),
  });
});

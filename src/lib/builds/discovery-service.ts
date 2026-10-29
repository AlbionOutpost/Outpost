import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db, databaseService } from "../db";
import { contentTypes } from "./validation";
import { buildDiscovery } from "../build-discovery";

const actor = z.string().min(1).max(100);
const pageNumber = z.number().int().min(1).max(10000);
const codes = new Set(buildDiscovery.weapons.map((weapon) => weapon.code));
const discoveryInput = z
  .object({
    q: z.string().trim().max(100),
    mine: z.boolean(),
    content: z.union([z.enum(contentTypes), z.literal("")]),
    codes: z.array(z.string().refine((code) => codes.has(code))).max(200),
    sort: z.enum(["saved", "recent"]),
    page: pageNumber,
  })
  .strict();
const favoritesInput = z
  .object({
    q: z.string().trim().max(100),
    sort: z.enum(["saved", "updated", "title"]),
    page: pageNumber,
    compPage: pageNumber,
  })
  .strict();
export type DiscoveryInput = z.infer<typeof discoveryInput>;
export type FavoritesInput = z.infer<typeof favoritesInput>;

async function localListAccountBuilds(userId: string | null, input: DiscoveryInput) {
  const viewer = actor.nullable().parse(userId),
    { q, mine, content, codes, sort, page: requestedPage } = discoveryInput.parse(input);
  const where: Prisma.BuildWhereInput = {
    hiddenAt: null,
    ...(content ? { contentType: content } : {}),
    ...(codes.length
      ? {
          equipment: {
            some: {
              slot: "Main hand",
              OR: codes.flatMap((code) => [
                { itemId: { endsWith: `_${code}` } },
                { itemId: { contains: `_${code}@` } },
              ]),
            },
          },
        }
      : {}),
    ...(mine ? (viewer ? { authorId: viewer } : { id: { in: [] } }) : { visibility: "PUBLIC" }),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  return db.$transaction(
    async (tx) => {
      const total = await tx.build.count({ where }),
        pages = Math.max(1, Math.ceil(total / 24)),
        page = Math.min(requestedPage, pages);
      const builds = await tx.build.findMany({
        where,
        orderBy:
          sort === "saved"
            ? [{ favorites: { _count: "desc" } }, { updatedAt: "desc" }, { id: "asc" }]
            : [{ updatedAt: "desc" }, { id: "asc" }],
        take: 24,
        skip: (page - 1) * 24,
        include: {
          equipment: true,
          author: { select: { name: true } },
          favorites: { where: { userId: viewer || "" }, select: { userId: true }, take: 1 },
          _count: { select: { favorites: true } },
        },
      });
      return { builds, total, page, pages };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

async function localListAccountFavorites(userId: string, input: FavoritesInput) {
  const viewer = actor.parse(userId),
    { q, sort, page: requestedPage, compPage: requestedCompPage } = favoritesInput.parse(input);
  return db.$transaction(
    async (tx) => {
      const buildWhere: Prisma.BuildFavoriteWhereInput = {
          userId: viewer,
          build: {
            hiddenAt: null,
            OR: [{ visibility: { in: ["PUBLIC", "UNLISTED"] } }, { authorId: viewer }],
            ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
          },
        },
        compWhere: Prisma.CompositionFavoriteWhereInput = {
          userId: viewer,
          composition: {
            hiddenAt: null,
            OR: [
              { visibility: "PUBLIC" },
              { visibility: "PRIVATE", authorId: viewer },
              { visibility: "GROUP", group: { members: { some: { userId: viewer } } } },
            ],
          },
        };
      const total = await tx.buildFavorite.count({ where: buildWhere }),
        compTotal = await tx.compositionFavorite.count({ where: compWhere }),
        pages = Math.max(1, Math.ceil(total / 24)),
        compPages = Math.max(1, Math.ceil(compTotal / 24)),
        page = Math.min(requestedPage, pages),
        compPage = Math.min(requestedCompPage, compPages);
      const builds = await tx.buildFavorite.findMany({
        where: buildWhere,
        take: 24,
        skip: (page - 1) * 24,
        orderBy:
          sort === "title"
            ? [{ build: { title: "asc" } }, { buildId: "asc" }]
            : sort === "updated"
              ? [{ build: { updatedAt: "desc" } }, { buildId: "asc" }]
              : [{ createdAt: "desc" }, { buildId: "asc" }],
        select: {
          build: {
            include: {
              equipment: true,
              author: { select: { name: true } },
              _count: { select: { favorites: true } },
            },
          },
        },
      });
      const compositions = await tx.compositionFavorite.findMany({
        where: compWhere,
        take: 24,
        skip: (compPage - 1) * 24,
        orderBy: [{ createdAt: "desc" }, { compositionId: "asc" }],
        select: { composition: { select: { id: true, title: true } } },
      });
      return { builds, compositions, total, compTotal, page, pages, compPage, compPages };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export const listAccountBuilds: typeof localListAccountBuilds = (...args) =>
  databaseService<Awaited<ReturnType<typeof localListAccountBuilds>>>("listAccountBuilds", args) ??
  localListAccountBuilds(...args);
export const listAccountFavorites: typeof localListAccountFavorites = (...args) =>
  databaseService<Awaited<ReturnType<typeof localListAccountFavorites>>>(
    "listAccountFavorites",
    args,
  ) ?? localListAccountFavorites(...args);

import { z } from "zod";
import { db } from "@/lib/db";
import { equipmentSlots } from "@/lib/albion/equipment-catalog";
import { catalogVariantIds, groupCatalogOptions } from "./search";

export const PAGE_SIZE = 30;
export const catalogQuery = z.object({
  search: z.string().max(100).default(""),
  slot: z.enum(equipmentSlots).optional(),
  tier: z.coerce.number().int().min(1).max(8).optional(),
  enchantment: z.coerce.number().int().min(0).max(4).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type CatalogQuery = z.infer<typeof catalogQuery>;

const select = { id: true, name: true, slot: true, tier: true, enchantment: true } as const;
// Within each band: tier, then flat before enchanted, then the item id.
const orderBy = [{ tier: "asc" }, { enchantment: "asc" }, { id: "asc" }] as const;
/** T4+ first: the gear players buy and craft, before T1–T3 starter tools and food. */
const bands = [
  [4, 5, 6, 7, 8],
  [1, 2, 3],
];

function filter(q: CatalogQuery) {
  return {
    active: true,
    ...(q.slot ? { slot: q.slot } : {}),
    ...(q.enchantment !== undefined ? { enchantment: q.enchantment } : {}),
    // An empty search matches every name and id, so it adds no term (and no full-table LIKE).
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" as const } },
            { id: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

/** Rows `skip`…`skip + take` of the matches, T4+ before T1–T3; plus the match count. */
async function ordered(q: CatalogQuery, skip: number, take: number) {
  const where = filter(q);
  const wheres = q.tier
    ? [{ ...where, tier: q.tier }]
    : bands.map((tiers) => ({ ...where, tier: { in: tiers } }));
  const counts = await db.$transaction(wheres.map((w) => db.itemMetadata.count({ where: w })));
  const items: { id: string; name: string; slot: string; tier: number; enchantment: number }[] = [];
  let offset = skip;
  for (const [index, count] of counts.entries()) {
    if (items.length < take && offset < count)
      items.push(
        ...(await db.itemMetadata.findMany({
          where: wheres[index],
          orderBy: [...orderBy],
          skip: offset,
          take: take - items.length,
          select,
        })),
      );
    offset = Math.max(0, offset - count);
  }
  return { items, total: counts.reduce((sum, count) => sum + count, 0) };
}

/** One page of the item database, T4+ equipment first. */
export async function searchCatalog(q: CatalogQuery) {
  const { items, total } = await ordered(q, (q.page - 1) * PAGE_SIZE, PAGE_SIZE);
  return { items, total, page: q.page, pageSize: PAGE_SIZE };
}

/** Search as one row per base item (Market Explorer); tier and enchantment are picked after. */
export async function searchCatalogGrouped(q: CatalogQuery) {
  const { items } = await ordered(q, 0, 400);
  const groups = groupCatalogOptions(items, q.search);
  return { items: groups.slice(0, PAGE_SIZE), total: groups.length, page: 1, pageSize: PAGE_SIZE };
}

/** Every catalog version of an item: its tiers and enchantments with their base IP. */
export async function catalogVariants(id: string) {
  const ids = catalogVariantIds(id);
  if (!ids.length) return [];
  // Looked up by id alone: with `active` in the SQL, SQLite walks the whole active index instead.
  const rows = await db.itemMetadata.findMany({
    where: { id: { in: ids } },
    select: { ...select, itemPower: true, active: true },
    orderBy: [{ tier: "asc" }, { enchantment: "asc" }],
  });
  return rows.flatMap(({ active, ...row }) => (active ? [row] : []));
}

/** The ids among these that have an active catalog page, by id lookups only (as above). */
export async function activeCatalogIds(ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await db.itemMetadata.findMany({
    where: { id: { in: ids } },
    select: { id: true, active: true },
  });
  return new Set(rows.flatMap((row) => (row.active ? [row.id] : [])));
}

/** The equipment slots the active catalog has items in, A–Z: one indexed row per slot instead of
 * reading every item for a distinct list (imports only accept these slots). */
export async function catalogSlots() {
  const found = await db.$transaction(
    equipmentSlots.map((slot) =>
      db.itemMetadata.findFirst({ where: { active: true, slot }, select: { slot: true } }),
    ),
  );
  return found.flatMap((row) => (row ? [row.slot] : [])).sort();
}

import { z } from "zod";

export const catalogSearchResponse = z.object({
  items: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/)
          .max(100),
        name: z.string().min(1).max(120),
        slot: z.string().min(1).max(50),
        tier: z.number().int().min(1).max(8),
        enchantment: z.number().int().min(0).max(4),
        /** Grouped search: the tiers and enchantments of the base item that matched. */
        tiers: z.tuple([z.number().int(), z.number().int()]).optional(),
        enchantments: z.tuple([z.number().int(), z.number().int()]).optional(),
      }),
    )
    .max(30),
});
export type CatalogOption = z.infer<typeof catalogSearchResponse>["items"][number];

/** The item without its tier and enchantment: `T6_MAIN_SWORD@1` → `MAIN_SWORD`. */
export const catalogBaseKey = (id: string) => id.replace(/^T[1-8]_/, "").replace(/@[1-4]$/, "");

/** Every tier and enchantment an item id could take; the catalog decides which exist. */
export function catalogVariantIds(id: string) {
  const match = /^T([1-8])_(.+?)(?:@([1-4]))?$/.exec(id);
  if (!match) return [];
  const ids: string[] = [];
  for (let tier = 1; tier <= 8; tier++)
    for (let enchantment = 0; enchantment <= 4; enchantment++)
      ids.push(`T${tier}_${match[2]}${enchantment ? `@${enchantment}` : ""}`);
  return ids;
}

/**
 * One row per base item instead of one per tier and enchantment. Each row is the version the
 * search names exactly (a typed `T6_MAIN_SWORD@1` stays that item), otherwise the first match in
 * the given order; it carries the tier and enchantment range that matched.
 */
export function groupCatalogOptions<T extends CatalogOption>(rows: T[], search = "") {
  const exact = search.trim().toUpperCase();
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = catalogBaseKey(row.id);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const range = (values: number[]) =>
    [Math.min(...values), Math.max(...values)] as [number, number];
  return [...groups.values()]
    .map((members) => ({
      ...(members.find((row) => row.id === exact) ?? members[0]),
      tiers: range(members.map((row) => row.tier)),
      enchantments: range(members.map((row) => row.enchantment)),
    }))
    .toSorted((a, b) => Number(b.id === exact) - Number(a.id === exact));
}

export function mergeCatalogOptions(
  remote: CatalogOption[],
  local: CatalogOption[],
  keyOf: (item: CatalogOption) => string = (item) => item.id,
) {
  const merged = new Map<string, CatalogOption>();
  for (const item of [...remote, ...local]) {
    if (!merged.has(keyOf(item))) merged.set(keyOf(item), item);
    if (merged.size === 30) break;
  }
  return [...merged.values()];
}

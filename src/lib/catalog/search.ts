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
      }),
    )
    .max(30),
});
export type CatalogOption = z.infer<typeof catalogSearchResponse>["items"][number];

export function mergeCatalogOptions(remote: CatalogOption[], local: CatalogOption[]) {
  const merged = new Map<string, CatalogOption>();
  for (const item of [...remote, ...local]) {
    if (!merged.has(item.id)) merged.set(item.id, item);
    if (merged.size === 30) break;
  }
  return [...merged.values()];
}

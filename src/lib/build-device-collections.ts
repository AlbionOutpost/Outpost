import { z } from "zod";
import { regionSchema, type Region } from "./albion/region-config";
const publicBuild = z
  .object({
    id: z.string().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/),
    title: z.string().max(200),
    author: z.string().max(100),
    weaponName: z.string().max(100),
    category: z.string().max(100),
    itemId: z
      .string()
      .regex(/^[A-Z0-9_@]{3,100}$/)
      .or(z.literal("")),
    updatedAt: z.string().max(64),
  })
  .strict();
export type SavedLibraryBuild = z.infer<typeof publicBuild>;
export const bookmarksSchema = z
  .object({ version: z.literal(1), region: regionSchema, builds: z.array(publicBuild).max(100) })
  .strict()
  .refine((v) => new Set(v.builds.map((b) => b.id)).size === v.builds.length);
const queryKeys = new Set([
  "q",
  "category",
  "family",
  "weapon",
  "tag",
  "sort",
  "content",
  "mine",
  "view",
]);
export const filterSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().trim().min(1).max(40),
    path: z.enum(["/builds", "/builds/library"]),
    query: z
      .record(z.string().max(30), z.string().max(100))
      .refine((q) => Object.keys(q).every((k) => queryKeys.has(k))),
  })
  .strict();
export const savedFiltersSchema = z
  .object({ version: z.literal(1), region: regionSchema, filters: z.array(filterSchema).max(8) })
  .strict()
  .refine((v) => new Set(v.filters.map((f) => f.id)).size === v.filters.length);
export function buildDeviceKey(kind: "bookmarks" | "filters", region: Region) {
  return `outpost:build-${kind}:v1:${region}`;
}
export function bookmarkCollection(raw: string | null, region: Region) {
  if (!raw) return { version: 1 as const, region, builds: [] as SavedLibraryBuild[] };
  if (raw.length > 100000) throw Error("Saved build data exceeds the device limit.");
  const result = bookmarksSchema.parse(JSON.parse(raw));
  if (result.region !== region) throw Error("Saved builds belong to another server.");
  return result;
}
export function filterCollection(raw: string | null, region: Region) {
  if (!raw) return { version: 1 as const, region, filters: [] as z.infer<typeof filterSchema>[] };
  if (raw.length > 20000) throw Error("Saved filter data exceeds the device limit.");
  const result = savedFiltersSchema.parse(JSON.parse(raw));
  if (result.region !== region) throw Error("Saved filters belong to another server.");
  return result;
}
export function savedFilterHref(filter: z.infer<typeof filterSchema>, region: Region) {
  const valid = filterSchema.parse(filter);
  return `${valid.path}?${new URLSearchParams({ ...valid.query, region })}`;
}

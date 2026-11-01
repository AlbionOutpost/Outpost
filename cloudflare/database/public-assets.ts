import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import { byLikes, listedBuild } from "../../src/lib/library-scope";
import { paginateLibrary, type LibraryQuery } from "../../src/lib/grind-library-query";
import type { DatabaseQuery } from "./protocol";
type Row = Record<string, unknown> & { id?: string; slug?: string; shard?: string };
export const readPublicAsset = cache(async (name: string): Promise<unknown> => {
  if (!/^(?:catalog|builds|compositions)-(?:index|\d+)\.json$/.test(name))
    throw Error("Invalid public snapshot asset");
  const binding = getCloudflareContext().env.ASSETS;
  if (!binding) throw Error("Public assets unavailable");
  const r = await binding.fetch(
    new Request(`https://outpost-assets.invalid/library/runtime/${name}`),
  );
  if (!r.ok) throw Error("Public snapshot unavailable");
  const text = await r.text();
  if (text.length > 4_000_000) throw Error("Public snapshot exceeds read budget");
  return JSON.parse(text);
});
async function details(rows: Row[]) {
  const shards = new Map<string, Row[]>();
  for (const name of new Set(rows.map((r) => r.shard!))) {
    shards.set(name, (await readPublicAsset(name)) as Row[]);
  }
  return rows.map((row) =>
    shards.get(row.shard!)!.find((x) => (x.id ?? x.slug) === (row.id ?? row.slug))!,
  );
}
export async function publicLibraryFind(kind: string, keys: string[]) {
  if (
    !["builds", "compositions"].includes(kind) ||
    keys.length > 500 ||
    keys.some((k) => typeof k !== "string" || k.length > 200)
  )
    throw Error("Invalid public references");
  const rows = (await readPublicAsset(`${kind}-index.json`)) as Row[];
  return details(rows.filter((r) => keys.includes(r.id ?? "") || keys.includes(r.slug ?? "")));
}
export async function publicLibraryPage(kind: string, input: LibraryQuery) {
  if (!["builds", "compositions"].includes(kind)) throw Error("Invalid public collection");
  const rows = (await readPublicAsset(`${kind}-index.json`)) as (Row & {
    title: string;
    author: string;
    category: string;
    updatedAt?: string;
    upvotes?: number;
  })[];
  // Same scope and ranking as the archive (src/lib/library-scope.ts); finds still see all rows.
  const listed = (kind === "builds" ? rows.filter(listedBuild) : [...rows]).sort(byLikes);
  const result = paginateLibrary(listed, input, kind === "builds" ? 24 : 18);
  return { ...result, rows: await details(result.rows) };
}
function match(row: Row, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR" || key === "AND") {
      if (!Array.isArray(value)) throw Error("Unsupported public filter");
      return key === "OR" ? value.some((v) => match(row, v)) : value.every((v) => match(row, v));
    }
    if (!(key in row)) throw Error("Unsupported public field");
    if (value && typeof value === "object") {
      const filter = value as Record<string, unknown>;
      return Object.entries(filter).every(([op, v]) => {
        if (op === "mode") return v === "insensitive";
        if (op === "contains")
          return String(row[key]).toLowerCase().includes(String(v).toLowerCase());
        if (op === "in") return Array.isArray(v) && v.includes(row[key]);
        if (op === "equals") return row[key] === v;
        throw Error("Unsupported public operator");
      });
    }
    return row[key] === value;
  });
}
export async function publicCatalogQuery(query: DatabaseQuery) {
  const data = (await readPublicAsset("catalog-index.json")) as { items: Row[]; releases: Row[] };
  const args = query.args ?? {};
  let rows =
    query.model === "itemMetadata"
      ? data.items
      : query.model === "catalogRelease"
        ? data.releases
        : null;
  if (!rows) throw Error("Private model cannot use public snapshots");
  rows = rows.filter((r) => match(r, args.where as Record<string, unknown>));
  if (query.operation === "count") return rows.length;
  if (args.orderBy) {
    const order = args.orderBy as Record<string, string>;
    rows = [...rows].sort((a, b) => {
      for (const [key, dir] of Object.entries(order)) {
        const left = String(a[key]),
          right = String(b[key]);
        const r = left < right ? -1 : left > right ? 1 : 0;
        if (r) return dir === "desc" ? -r : r;
      }
      return 0;
    });
  }
  if (
    !["findMany", "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow"].includes(
      query.operation,
    )
  )
    throw Error("Public snapshots are read-only");
  if (query.operation !== "findMany") rows = rows.slice(0, 1);
  else
    rows = rows.slice(
      Number(args.skip ?? 0),
      Number(args.skip ?? 0) + Math.min(1000, Number(args.take ?? 1000)),
    );
  if (query.model === "itemMetadata") rows = await details(rows);
  if (args.include && (args.include as Record<string, unknown>).release)
    rows = rows.map((r) => ({ ...r, release: data.releases.find((x) => x.id === r.releaseId) }));
  if (args.select)
    rows = rows.map((r) =>
      Object.fromEntries(
        Object.entries(args.select as Record<string, unknown>)
          .filter(([, v]) => v === true)
          .map(([k]) => [k, r[k]]),
      ),
    );
  if (query.operation === "findMany") return rows;
  if (!rows.length && query.operation.endsWith("OrThrow")) throw Error("Public item unavailable");
  return rows[0] ?? null;
}

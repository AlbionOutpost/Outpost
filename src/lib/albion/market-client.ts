import { z } from "zod";
import { regionSchema, type Region } from "./region-config";
import { requestData } from "./data-client";
import { marketPrice as price } from "./market-quotes";
import { redis } from "../redis";
import { type MarketPrice } from "./market-quotes";
export type { MarketPrice } from "./market-quotes";
export { isStale } from "./freshness";

// Exact public item/quality slices let overlapping build, city and recipe requests
// reuse observations instead of exhausting the source budget with new batch URLs.
const itemCache = new Map<string, { until: number; rows: MarketPrice[]; bytes: number }>();
let itemCacheBytes = 0;
const ttl = 60;
const maxItemCacheBytes = 2 * 1024 * 1024;
function removeItem(key: string) {
  const entry = itemCache.get(key);
  if (entry) itemCacheBytes -= entry.bytes;
  itemCache.delete(key);
}
function rememberItem(key: string, rows: MarketPrice[]) {
  removeItem(key);
  const bytes = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
  if (bytes > maxItemCacheBytes) return;
  while (itemCache.size >= 512 || itemCacheBytes + bytes > maxItemCacheBytes) {
    const oldest = itemCache.keys().next().value;
    if (!oldest) break;
    removeItem(oldest);
  }
  itemCache.set(key, { rows, until: Date.now() + ttl * 1000, bytes });
  itemCacheBytes += bytes;
}
function itemKey(region: Region, item: string, quality: number) {
  return `atlas:data:price-item:v1:${region}:${quality}:${item}`;
}
function itemSchema(item: string, quality: number) {
  return z
    .array(price)
    .max(100)
    .refine(
      (rows) => rows.every((row) => row.item_id === item && row.quality === quality),
      "Unexpected item or quality in cached observation",
    );
}
export async function getPrices(region: Region, items: string[], quality: number | number[]) {
  regionSchema.parse(region);
  const qualities = [...new Set(Array.isArray(quality) ? quality : [quality])].sort();
  if (
    !qualities.length ||
    qualities.length > 5 ||
    qualities.some((q) => !Number.isInteger(q) || q < 1 || q > 5) ||
    !items.length ||
    items.length > 50 ||
    items.some((id) => !/^[A-Z0-9_@]{3,100}$/.test(id))
  )
    throw new Error("Invalid item batch");
  const uniqueItems = [...new Set(items)].sort();
  const client = redis();
  const found = new Map<string, MarketPrice[]>();
  // A Free Worker has a bounded subrequest budget. Keep cache fan-out bounded
  // even for50-item/five-quality callers; the remaining pairs use batch caching.
  const sharedKeys = new Set(
    uniqueItems.flatMap((item) => qualities.map((q) => itemKey(region, item, q))).slice(0, 12),
  );
  await Promise.all(
    uniqueItems.flatMap((item) =>
      qualities.map(async (q) => {
        const key = itemKey(region, item, q),
          hit = itemCache.get(key);
        if (hit && hit.until > Date.now()) {
          found.set(key, hit.rows);
          return;
        }
        if (hit) removeItem(key);
        if (client && sharedKeys.has(key)) {
          try {
            const saved = await client.get(key);
            if (saved && saved.length <= 100000) {
              const rows = itemSchema(item, q).parse(JSON.parse(saved));
              // Do not extend the shared cache TTL by copying it into memory.
              found.set(key, rows);
            }
          } catch {}
        }
      }),
    ),
  );
  const missingItems: string[] = [];
  const missingQualities = new Set<number>();
  for (const item of uniqueItems) {
    const missing = qualities.filter((q) => !found.has(itemKey(region, item, q)));
    if (!missing.length) continue;
    missingItems.push(item);
    missing.forEach((q) => missingQualities.add(q));
  }
  // Sparse cache coverage must not turn a bounded multi-quality batch into
  // dozens of upstream requests. Fetch the missing union in URL-sized chunks.
  if (missingItems.length) {
    const qualityList = [...missingQualities].sort().join(","),
      group = missingItems;
    const wanted = qualityList.split(",").map(Number);
    const pathFor = (ids: string[]) =>
      `/api/v2/stats/prices/${ids.join(",")}.json?qualities=${qualityList}`;
    // The source allows 4096-character URLs. The shared transport deliberately
    // keeps paths below3900; split by that actual budget rather than item count.
    const chunks: string[][] = [];
    for (const item of group) {
      const last = chunks.at(-1);
      if (!last || pathFor([...last, item]).length > 3900) chunks.push([item]);
      else last.push(item);
    }
    for (const chunk of chunks) {
      const rows = await requestData(
        region,
        pathFor(chunk),
        z
          .array(price)
          .max(10000)
          .refine(
            (values) =>
              values.every((row) => chunk.includes(row.item_id) && wanted.includes(row.quality)),
            "Unexpected item or quality in source response",
          ),
      );
      for (const item of chunk)
        for (const q of wanted) {
          const key = itemKey(region, item, q);
          // Union requests can include already-cached pairs. An omitted side
          // must not erase a still-valid exact slice or extend its cache life.
          if (found.has(key)) continue;
          const selected = rows.filter((row) => row.item_id === item && row.quality === q);
          found.set(key, selected);
          rememberItem(key, selected);
          if (client && sharedKeys.has(key)) {
            try {
              await client.set(key, JSON.stringify(selected), "EX", ttl);
            } catch {}
          }
        }
    }
  }
  return uniqueItems.flatMap((item) =>
    qualities.flatMap((q) => found.get(itemKey(region, item, q))!),
  );
}

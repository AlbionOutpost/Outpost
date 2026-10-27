import { z } from "zod";
import { regions, regionSchema, type Region } from "./region-config";
import { redis, rateLimit } from "../redis";
import { retryDelay } from "./backoff";
const cache = new Map<string, { until: number; data: unknown; bytes: number }>();
let cacheBytes = 0;
const maxCacheBytes = 8 * 1024 * 1024;
function removeCached(key: string) {
  const row = cache.get(key);
  if (row) cacheBytes -= row.bytes;
  cache.delete(key);
}
const pending = new Map<string, Promise<unknown>>();
const blocked = new Map<Region, number>();
export async function requestData<T>(
  region: Region,
  path: string,
  schema: z.ZodType<T>,
  ttl = 60,
): Promise<T> {
  regionSchema.parse(region);
  if (
    !/^\/api\/v2\/stats\/(prices|history|gold)[/?.]/.test(path) ||
    path.includes("..") ||
    path.length > 3900
  )
    throw new Error("Invalid data request");
  const key = `${region}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return schema.parse(hit.data);
  if (hit) removeCached(key);
  const existing = pending.get(key);
  if (existing) return schema.parse(await existing);
  const request = (async () => {
    const client = redis();
    if (client) {
      try {
        const saved = await client.get(`atlas:data:${key}`);
        if (saved && saved.length <= 2000000) return schema.parse(JSON.parse(saved));
      } catch {}
    }
    if ((blocked.get(region) ?? 0) > Date.now())
      throw new Error("Data source rate limit reached. Please retry later.");
    if (client) {
      try {
        if (await client.exists(`atlas:upstream-block:${region}`))
          throw new Error("Data source rate limit reached. Please retry later.");
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Data source")) throw e;
      }
    }
    if (!(await rateLimit(`upstream:${region}`, 20, 60)))
      throw new Error("Data source request budget exhausted. Please retry later.");
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(`${regions[region].host}${path}`, {
        headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        redirect: "error",
      });
      if (response.status !== 429) break;
      const delay = retryDelay(response.headers);
      blocked.set(region, Date.now() + delay);
      if (client) {
        try {
          await client.set(`atlas:upstream-block:${region}`, "1", "PX", Math.ceil(delay));
        } catch {}
      }
      if (attempt === 0 && delay <= 1000) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error("Data source rate limit reached. Please retry later.");
    }
    if (!response?.ok) throw new Error("Market source unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty source response");
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2000000) {
        await reader.cancel();
        throw new Error("Market response too large");
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = schema.parse(JSON.parse(new TextDecoder().decode(buffer)));
    for (const [oldKey, row] of cache) if (row.until <= Date.now()) removeCached(oldKey);
    while (cache.size >= 128 || cacheBytes + length > maxCacheBytes) {
      const oldest = cache.keys().next().value;
      if (!oldest) break;
      removeCached(oldest);
    }
    cache.set(key, { until: Date.now() + ttl * 1000, data, bytes: length });
    cacheBytes += length;
    if (client) {
      try {
        await client.set(`atlas:data:${key}`, JSON.stringify(data), "EX", ttl);
      } catch {}
    }
    return data;
  })();
  pending.set(key, request);
  try {
    return schema.parse(await request);
  } finally {
    pending.delete(key);
  }
}

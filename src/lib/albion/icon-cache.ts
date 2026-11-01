import { itemIconUrl } from "./item-renderer";
import { inflightCache } from "../inflight-cache";
const fallback = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="#202529"/><path d="M48 27L69 48L48 69L27 48Z" fill="none" stroke="#8b949e" stroke-width="2"/><title>Item icon unavailable</title></svg>',
);
type Icon = { bytes: Uint8Array; type: string; available: boolean; maxAge: number };
// Application safeguards, not a claim about the renderer operator's permitted rate.
const MAX_REQUESTS_PER_MINUTE = 240;
const MAX_CONCURRENT = 4;
const MAX_PENDING = 32;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
let active = 0;
const waiters: (() => void)[] = [];
function release() {
  const next = waiters.shift();
  if (next) next();
  else active--;
}
function unavailable(maxAge: number): Icon {
  return { bytes: fallback, type: "image/svg+xml", available: false, maxAge };
}
function remember(url: string, icon: Icon) {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
  cache.delete(url);
  let bytes = [...cache.values()].reduce((sum, entry) => sum + entry.icon.bytes.byteLength, 0);
  while (cache.size && (cache.size >= 512 || bytes + icon.bytes.byteLength > MAX_CACHE_BYTES)) {
    const key = cache.keys().next().value!;
    bytes -= cache.get(key)!.icon.bytes.byteLength;
    cache.delete(key);
  }
  cache.set(url, { icon, expires: now + icon.maxAge * 1000 });
}
const cache = new Map<string, { icon: Icon; expires: number }>();
let windowStart = 0,
  requests = 0;
async function renderOne(id: string, quality: number): Promise<Icon> {
  const inflight = inflightCache("renderer") as Map<string, Promise<Icon>>;
  const url = itemIconUrl(id, quality, 96),
    now = Date.now(),
    old = cache.get(url);
  if (old && old.expires > now) return old.icon;
  const pending = inflight.get(url);
  if (pending) return pending;
  if (now - windowStart >= 60000) {
    windowStart = now;
    requests = 0;
  }
  if (requests >= MAX_REQUESTS_PER_MINUTE)
    return unavailable(Math.max(1, Math.ceil((windowStart + 60000 - now) / 1000)));
  // Refuse excess work without retaining a five-minute negative cache entry.
  if (active >= MAX_CONCURRENT && waiters.length >= MAX_PENDING) return unavailable(5);
  requests++;
  const promise = (async () => {
    if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiters.push(resolve));
    else active++;
    let icon = unavailable(300);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2500),
        redirect: "manual",
        headers: { Accept: "image/png" },
      });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png"))
        throw new Error();
      if (Number(response.headers.get("content-length")) > 200000) throw new Error();
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 200000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      if (![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) throw new Error();
      icon = { bytes, type: "image/png", available: true, maxAge: 21600 };
    } catch {
      /* Optional artwork must never prevent a tool from loading. */
    } finally {
      release();
    }
    remember(url, icon);
    return icon;
  })();
  inflight.set(url, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(url);
  }
}

/**
 * Art for the requested item, falling back to the base-tier art when the render server has no
 * image for the enchanted id (it 404s many @4 ids). The neutral placeholder is a last resort.
 */
export async function renderIcon(id: string, quality: number): Promise<Icon> {
  const first = await renderOne(id, quality);
  if (first.available) return first;
  const base = id.replace(/@\d$/, "");
  if (base === id) return first;
  const fallback = await renderOne(base, quality);
  return fallback.available ? fallback : first;
}

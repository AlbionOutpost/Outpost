import { getCloudflareContext } from "@opennextjs/cloudflare";
import { databaseBinding } from "./web-driver";
const publicCache = () => (caches as CacheStorage & { readonly default: Cache }).default;

function cacheKey(key: string) {
  if (/^atlas:combat:(europe|americas|asia):(0|[1-9]\d?|1\d\d|200)$/.test(key)) {
    const offset = Number(key.split(":").at(-1));
    if (offset % 20 === 0)
      return new Request(`https://outpost-cache.invalid/combat/${encodeURIComponent(key)}`);
  }
  if (key.startsWith("atlas:data:") && key.length <= 4200)
    return new Request(`https://outpost-cache.invalid/market/${encodeURIComponent(key)}`);
  throw new Error("Only bounded public market and combat observations may enter the shared cache");
}
function cooldownRegion(key: string) {
  const match = /^atlas:upstream-block:(europe|americas|asia)$/.exec(key);
  if (!match) throw new Error("Invalid upstream cooldown key");
  return match[1];
}
const client = {
  async get(key: string) {
    const response = await publicCache().match(cacheKey(key));
    return response ? response.text() : null;
  },
  async set(key: string, value: string, mode: string, duration: number) {
    if (key.startsWith("atlas:upstream-block:")) {
      if (mode !== "PX") throw new Error("Invalid cooldown duration");
      await databaseBinding().upstreamBlock(cooldownRegion(key), duration);
      return "OK";
    }
    if (
      mode !== "EX" ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 3600 ||
      value.length > 2_000_000 ||
      (key.startsWith("atlas:combat:") && (duration > 45 || value.length > 1_000_000))
    )
      throw new Error("Invalid public cache entry");
    await publicCache().put(
      cacheKey(key),
      new Response(value, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${duration}`,
        },
      }),
    );
    return "OK";
  },
  async exists(key: string) {
    return Number(await databaseBinding().upstreamBlocked(cooldownRegion(key)));
  },
  async ping() {
    getCloudflareContext();
    return (await databaseBinding().health())
      ? "PONG"
      : Promise.reject(new Error("Cloudflare data binding unavailable"));
  },
};
export function redis() {
  return client;
}
export async function rateLimit(key: string, limit: number, seconds: number, cost = 1) {
  try {
    // An unweighted call keeps the three-argument RPC the edge budget uses.
    return await (cost === 1
      ? databaseBinding().rateLimit(key, limit, seconds)
      : databaseBinding().rateLimit(key, limit, seconds, cost));
  } catch {
    return false;
  }
}

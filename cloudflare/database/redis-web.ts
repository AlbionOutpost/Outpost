import { getCloudflareContext } from "@opennextjs/cloudflare";
import { databaseBinding } from "./web-driver";

function cacheKey(key: string) {
  if (!key.startsWith("atlas:data:") || key.length > 4200)
    throw new Error("Only public regional market observations may enter the shared cache");
  return new Request(`https://outpost-cache.invalid/market/${encodeURIComponent(key)}`);
}
function cooldownRegion(key: string) {
  const match = /^atlas:upstream-block:(europe|americas|asia)$/.exec(key);
  if (!match) throw new Error("Invalid upstream cooldown key");
  return match[1];
}
const client = {
  async get(key: string) {
    const response = await caches.default.match(cacheKey(key));
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
      value.length > 2_000_000
    )
      throw new Error("Invalid public cache entry");
    await caches.default.put(
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
export async function rateLimit(key: string, limit: number, seconds: number) {
  try {
    return await databaseBinding().rateLimit(key, limit, seconds);
  } catch {
    return false;
  }
}

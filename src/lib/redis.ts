import Redis from "ioredis";
const globalRedis = globalThis as unknown as { atlasRedis?: Redis };
export function redis() {
  if (!process.env.REDIS_URL) return null;
  if (!globalRedis.atlasRedis || globalRedis.atlasRedis.status === "end") {
    const client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      retryStrategy: () => null,
    });
    client.on("error", () => {});
    globalRedis.atlasRedis = client;
  }
  return globalRedis.atlasRedis;
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const client = redis();
  if (!client) return process.env.NODE_ENV !== "production";
  try {
    const count = await client.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
      1,
      `atlas:limit:${key}`,
      seconds,
    );
    return Number(count) <= limit;
  } catch {
    return false;
  }
}

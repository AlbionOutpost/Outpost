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
/**
 * A fixed-window budget: true while `limit` is not used up. `cost` weighs one call (KiB saved,
 * for example); a weighted call that does not fit is refused and spends nothing.
 */
export async function rateLimit(key: string, limit: number, seconds: number, cost = 1) {
  const client = redis();
  if (!client) return process.env.NODE_ENV !== "production";
  try {
    if (cost !== 1)
      return (
        Number(
          await client.eval(
            "local n = tonumber(redis.call('GET', KEYS[1]) or '0'); local c = tonumber(ARGV[2]); if n + c > tonumber(ARGV[3]) then return 0 end; if redis.call('INCRBY', KEYS[1], c) == c then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return 1",
            1,
            `atlas:limit:${key}`,
            seconds,
            cost,
            limit,
          ),
        ) === 1
      );
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

import { it, expect, vi } from "vitest";
vi.mock("ioredis", () => ({
  default: class {
    status = "wait";
    on() {
      return this;
    }
  },
}));
it("recreates a closed Redis client rather than keeping a permanent outage", async () => {
  const before = process.env.REDIS_URL;
  process.env.REDIS_URL = "redis://localhost:6379";
  try {
    const { redis } = await import("../src/lib/redis");
    const first = redis()!;
    first.status = "end";
    expect(redis()).not.toBe(first);
  } finally {
    process.env.REDIS_URL = before;
  }
});

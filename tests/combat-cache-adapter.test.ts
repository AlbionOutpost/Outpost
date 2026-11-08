import { describe, expect, it, vi } from "vitest";
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({}) }));
vi.mock("../cloudflare/database/web-driver", () => ({ databaseBinding: () => ({}) }));
import { redis } from "../cloudflare/database/redis-web";

describe("public combat cache boundary", () => {
  it("round-trips supported region/pages while refusing private or malformed namespaces", async () => {
    const entries = new Map<string, Response>();
    vi.stubGlobal("caches", {
      default: {
        match: async (key: Request) => entries.get(key.url)?.clone(),
        put: async (key: Request, response: Response) => {
          entries.set(key.url, response);
        },
      },
    });
    try {
      const client = redis();
      for (const key of [
        "atlas:combat:europe:0",
        "atlas:combat:asia:200",
        "atlas:data:price-item:v1:europe:1:T4_BAG",
      ]) {
        await client.set(key, '{"events":[]}', "EX", 45);
        expect(await client.get(key)).toBe('{"events":[]}');
      }
      for (const key of [
        "atlas:combat:europe:1",
        "atlas:combat:europe:220",
        "atlas:combat:other:0",
        "atlas:combat:europe:0:private",
        "atlas:user:private",
      ])
        await expect(client.get(key)).rejects.toThrow();
      await expect(client.set("atlas:combat:europe:0", "[]", "EX", 46)).rejects.toThrow();
      await expect(
        client.set("atlas:combat:europe:0", "x".repeat(1_000_001), "EX", 45),
      ).rejects.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

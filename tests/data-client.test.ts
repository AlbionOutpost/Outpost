import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
vi.mock("../src/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("source safety", () => {
  it("shares an upstream cooldown across different endpoints", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("limited", {
        status: 429,
        headers: { "RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 300) },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const { requestData } = await import("../src/lib/albion/data-client");
    await expect(
      requestData("asia", "/api/v2/stats/gold.json?count=1", z.array(z.unknown())),
    ).rejects.toThrow("rate limit");
    await expect(
      requestData("asia", "/api/v2/stats/history/T4_BAG.json", z.array(z.unknown())),
    ).rejects.toThrow("rate limit");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("limits URL length before fetching", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { requestData } = await import("../src/lib/albion/data-client");
    await expect(
      requestData("europe", "/api/v2/stats/prices/" + "A".repeat(4000), z.unknown()),
    ).rejects.toThrow("Invalid data request");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects unknown hosts and endpoint paths", async () => {
    const { requestData } = await import("../src/lib/albion/data-client");
    await expect(requestData("europe", "https://localhost/admin", z.unknown())).rejects.toThrow();
  });
});

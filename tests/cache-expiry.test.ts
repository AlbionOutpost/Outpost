import { it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
vi.mock("../src/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("expires cached observations instead of serving them indefinitely", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response("[]")));
  vi.stubGlobal("fetch", fetcher);
  const { requestData } = await import("../src/lib/albion/data-client");
  await requestData("europe", "/api/v2/stats/gold.json?count=2", z.array(z.unknown()), 60);
  await requestData("europe", "/api/v2/stats/gold.json?count=2", z.array(z.unknown()), 60);
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 61000);
  await requestData("europe", "/api/v2/stats/gold.json?count=2", z.array(z.unknown()), 60);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not cache mismatched source item identities", async () => {
  const fetcher = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify([
          {
            item_id: "T4_WRONG",
            city: "Lymhurst",
            quality: 1,
            sell_price_min: 1,
            buy_price_max: 1,
            sell_price_min_date: "2026-10-25T00:00:00",
            buy_price_max_date: "2026-10-25T00:00:00",
          },
        ]),
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  await expect(getPrices("europe", ["T4_BAG"], 1)).rejects.toThrow();
  await expect(getPrices("europe", ["T4_BAG"], 1)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("bounds the process cache by bytes", async () => {
  const payload = JSON.stringify(["x".repeat(1000000)]);
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(payload)));
  vi.stubGlobal("fetch", fetcher);
  const { requestData } = await import("../src/lib/albion/data-client");
  for (let i = 0; i < 9; i++)
    await requestData("europe", `/api/v2/stats/gold.json?count=${i}`, z.array(z.string()));
  await requestData("europe", "/api/v2/stats/gold.json?count=0", z.array(z.string()));
  expect(fetcher).toHaveBeenCalledTimes(10);
});

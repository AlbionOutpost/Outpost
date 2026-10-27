import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
const row = {
  item_id: "T4_BAG",
  city: "Lymhurst",
  quality: 1,
  sell_price_min: 1234,
  sell_price_min_date: "2026-10-26T08:00:00Z",
  buy_price_max: 1200,
  buy_price_max_date: "2026-10-26T08:00:00Z",
};
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
it.each([
  ["unsafe ask precision", { sell_price_min: Number.MAX_SAFE_INTEGER + 1 }],
  ["unsafe bid precision", { buy_price_max: Number.MAX_SAFE_INTEGER + 1 }],
  ["unbounded city", { city: "C".repeat(101) }],
  ["empty city", { city: "" }],
  ["unbounded ask timestamp", { sell_price_min_date: "D".repeat(65) }],
  ["unbounded bid timestamp", { buy_price_max_date: "D".repeat(65) }],
  ["wrong item identity", { item_id: "T4_CAPE" }],
  ["wrong quality identity", { quality: 2 }],
])("rejects %s before caching and permits a valid retry", async (_name, invalid) => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, ...invalid }])))
    .mockResolvedValueOnce(new Response(JSON.stringify([row])));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  await expect(getPrices("europe", ["T4_BAG"], 1)).rejects.toThrow();
  expect(await getPrices("europe", ["T4_BAG"], 1)).toEqual([row]);
  expect(await getPrices("europe", ["T4_BAG"], 1)).toEqual([row]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("shares the same pending/cache identity for reordered duplicate batches", async () => {
  const fetcher = vi.fn(
    async () => new Response(JSON.stringify([row, { ...row, item_id: "T4_CAPE" }])),
  );
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const [a, b] = await Promise.all([
    getPrices("asia", ["T4_BAG", "T4_CAPE"], 1),
    getPrices("asia", ["T4_CAPE", "T4_BAG", "T4_BAG"], 1),
  ]);
  expect(a).toEqual(b);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    "https://east.albion-online-data.com/api/v2/stats/prices/T4_BAG,T4_CAPE.json?qualities=1",
    expect.objectContaining({ redirect: "error" }),
  );
});
it("preserves missing-price and missing-date sentinels without manufacturing observations", async () => {
  const missing = {
    ...row,
    sell_price_min: 0,
    buy_price_max: 0,
    sell_price_min_date: "0001-01-01T00:00:00",
    buy_price_max_date: "",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify([missing]))),
  );
  const { getPrices } = await import("../src/lib/albion/market-client");
  expect(await getPrices("americas", ["T4_BAG"], 1)).toEqual([missing]);
});

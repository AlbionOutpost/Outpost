import { describe, it, expect, vi, afterEach } from "vitest";
import { getPrices } from "../src/lib/albion/market-client";
vi.mock("../src/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
const row = {
  item_id: "T4_TEST",
  city: "Lymhurst",
  quality: 1,
  sell_price_min: 100,
  sell_price_min_date: "2026-10-25T18:00:00",
  buy_price_max: 90,
  buy_price_max_date: "2026-10-25T18:00:00",
};
afterEach(() => vi.unstubAllGlobals());
describe("market boundaries", () => {
  it("deduplicates concurrent requests and caches a batch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([{ ...row, item_id: "T4_TEST" }])));
    vi.stubGlobal("fetch", fetcher);
    const [a, b] = await Promise.all([
      getPrices("europe", ["T4_TEST"], 1),
      getPrices("europe", ["T4_TEST"], 1),
    ]);
    expect(a).toEqual(b);
    await getPrices("europe", ["T4_TEST"], 1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("separates regions", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify([{ ...row, item_id: "T4_TEST" }]))),
      );
    vi.stubGlobal("fetch", fetcher);
    await getPrices("asia", ["T4_TEST"], 1);
    await getPrices("americas", ["T4_TEST"], 1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toContain("east.albion");
    expect(fetcher.mock.calls[1][0]).toContain("west.albion");
  });
  it("rejects malformed source records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([{ price: "invented" }]))),
    );
    await expect(getPrices("europe", ["T4_INVALID"], 1)).rejects.toThrow();
  });
  it("rejects item strings that could change the URL", async () => {
    await expect(getPrices("europe", ["../../secret"], 1)).rejects.toThrow();
  });
  it("does not fabricate prices on a source failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
    await expect(getPrices("europe", ["T4_FAILED"], 1)).rejects.toThrow("unavailable");
  });
});

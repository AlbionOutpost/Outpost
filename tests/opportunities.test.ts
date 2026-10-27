import { it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn() }));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
it("batches items, separates regions, calculates direct flips and leaves missing orders unavailable", async () => {
  mocks.prices.mockResolvedValue([
    {
      item_id: "T4_BAG",
      quality: 1,
      city: "Lymhurst",
      sell_price_min: 100,
      sell_price_min_date: "2020-01-01",
      buy_price_max: 90,
      buy_price_max_date: "2020-01-01",
    },
    {
      item_id: "T4_BAG",
      quality: 1,
      city: "Black Market",
      sell_price_min: 0,
      sell_price_min_date: "2020-01-01",
      buy_price_max: 150,
      buy_price_max_date: "2020-01-01",
    },
  ]);
  const { GET } = await import("../src/app/api/opportunities/route");
  const url =
    "http://localhost/api/opportunities?region=asia&items=T4_BAG,T4_MAIN_AXE&quality=1&fromCity=Lymhurst&toCity=Black%20Market&saleMode=instant&tax=8&fee=2.5";
  const r = await GET(new NextRequest(url));
  expect(r.status).toBe(200);
  const b = await r.json();
  expect(b.rows[0].profit).toBe(34.25);
  expect(b.rows[0].stale).toBe(true);
  expect(b.rows[1].profit).toBeNull();
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_BAG", "T4_MAIN_AXE"], 1);
  expect(
    (await GET(new NextRequest(url.replace("saleMode=instant", "saleMode=listing")))).status,
  ).toBe(400);
});

import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { summariseQualityAvailability } from "../src/lib/albion/market-availability";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), budget: vi.fn() }));
vi.mock("../src/lib/redis", () => ({ rateLimit: mocks.budget }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
const row = (quality: number, city: string, sell: number, buy: number, item_id = "T4_BAG") => ({
  item_id,
  quality,
  city,
  sell_price_min: sell,
  sell_price_min_date: "2020-01-01T00:00:00Z",
  buy_price_max: buy,
  buy_price_max_date: "2020-01-02T00:00:00Z",
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.budget.mockResolvedValue(true);
});
it("keeps missing qualities unknown, ignores another item and NPC asks, and retains dated alternatives", () => {
  const result = summariseQualityAvailability(
    [
      row(1, "Lymhurst", 0, 0),
      row(2, "Lymhurst", 120, 90),
      row(2, "Martlock", 100, 95),
      row(2, "Black Market", 1, 150),
      row(2, "Lymhurst", 2, 999, "T5_BAG"),
    ],
    "T4_BAG",
  );
  expect(result[0]).toMatchObject({ quality: 1, sell: null, buy: null });
  expect(result[1]).toEqual({
    quality: 2,
    sell: 100,
    sellCity: "Martlock",
    sellObservedAt: "2020-01-01T00:00:00Z",
    buy: 150,
    buyCity: "Black Market",
    buyObservedAt: "2020-01-02T00:00:00Z",
  });
  expect(result.slice(2).every((r) => r.sell === null && r.buy === null)).toBe(true);
  expect(
    summariseQualityAvailability(
      [row(2, "Lymhurst", 120, 90), row(2, "Martlock", 100, 95)],
      "T4_BAG",
      "Lymhurst",
    )[1],
  ).toMatchObject({ sell: 120, buy: 90, sellCity: "Lymhurst" });
});
it("requests all five exact qualities in one call and returns only public observations", async () => {
  mocks.prices.mockResolvedValue([row(2, "Martlock", 100, 95)]);
  const { GET } = await import("../src/app/api/market/qualities/route");
  const response = await GET(
    new NextRequest("http://localhost/api/market/qualities?region=asia&item=T4_BAG&city=Martlock"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("public, max-age=30");
  const data = await response.json();
  expect(data).toMatchObject({ region: "asia", item: "T4_BAG", city: "Martlock" });
  expect(data.qualities).toHaveLength(5);
  expect(mocks.prices).toHaveBeenCalledExactlyOnceWith("asia", ["T4_BAG"], [1, 2, 3, 4, 5]);
});
it("rejects invalid identities before source access and distinguishes rate limits from source failures", async () => {
  const { GET } = await import("../src/app/api/market/qualities/route");
  const url = "http://localhost/api/market/qualities?region=europe&item=T4_BAG";
  expect((await GET(new NextRequest(url + "&city=Unknown"))).status).toBe(400);
  expect(mocks.prices).not.toHaveBeenCalled();
  mocks.budget.mockResolvedValue(false);
  expect((await GET(new NextRequest(url))).status).toBe(429);
  expect(mocks.prices).not.toHaveBeenCalled();
  mocks.budget.mockResolvedValue(true);
  mocks.prices.mockRejectedValue(new Error("offline"));
  expect((await GET(new NextRequest(url))).status).toBe(503);
});

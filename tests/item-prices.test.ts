import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true, redis: () => null }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
vi.mock("../src/lib/db", () => ({ db: {} }));
import { GET } from "../src/app/api/items/prices/route";
import {
  ITEM_PRICE_BATCH,
  cheapestSellOrder,
  itemPricesQuery,
  itemPricesResponse,
} from "../src/lib/albion/item-prices";
import { PAGE_SIZE } from "../src/lib/catalog/item-search";

const now = Date.parse("2026-11-08T12:00:00Z");
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString().slice(0, 19);
const row = (item_id: string, city: string, sell: number, minutes = 5, quality = 1) => ({
  item_id,
  city,
  quality,
  sell_price_min: sell,
  sell_price_min_date: ago(minutes),
  buy_price_max: 10,
  buy_price_max_date: ago(minutes),
});
const get = (query: string) =>
  GET(new NextRequest(`https://albionoutpost.com/api/items/prices?${query}`));
const ids = (n: number) =>
  ["T4_BAG", "T5_BAG", "T6_BAG", "T4_CAPE", "T5_CAPE", "T6_CAPE"]
    .flatMap((base) => ["", "@1", "@2", "@3", "@4"].map((e) => base + e))
    .slice(0, n);

beforeEach(() => {
  mocks.prices.mockReset();
});

describe("item database prices query", () => {
  it("asks for one page at most", () => {
    expect(ITEM_PRICE_BATCH).toBe(PAGE_SIZE);
    expect(itemPricesQuery.safeParse({ region: "europe", items: ids(30).join(",") }).success).toBe(
      true,
    );
    expect(
      itemPricesQuery.safeParse({ region: "europe", items: ids(30).join(",") + ",T7_BAG" }).success,
    ).toBe(false);
  });
  it("rejects repeats, malformed IDs, empty lists and unknown servers", () => {
    for (const query of [
      { region: "europe", items: "T4_BAG,T4_BAG" },
      { region: "europe", items: "T4_BAG,../x" },
      { region: "europe", items: "t4_bag" },
      { region: "europe", items: "" },
      { region: "mars", items: "T4_BAG" },
      { items: "T4_BAG" },
    ])
      expect(itemPricesQuery.safeParse(query).success).toBe(false);
  });
});

describe("GET /api/items/prices", () => {
  it("answers 400 without asking the source for a bad or oversized request", async () => {
    for (const query of [
      `region=europe&items=${ids(30).join(",")},T7_BAG`,
      "region=europe&items=T4_BAG,T4_BAG",
      "region=europe&items=T4_NOT_A_REAL_ITEM",
      "region=nowhere&items=T4_BAG",
      "items=T4_BAG",
    ]) {
      const response = await get(query);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toMatch(/up to 30/);
    }
    expect(mocks.prices).not.toHaveBeenCalled();
  });
  it("asks once for the whole page at normal quality and keeps every buyable sell order", async () => {
    mocks.prices.mockResolvedValue([
      row("T5_BAG", "Martlock", 900),
      row("T4_BAG", "Lymhurst", 500),
      row("T4_BAG", "Black Market", 100),
      row("T4_BAG", "Bridgewatch", 0),
      row("T4_BAG", "Caerleon", 450, 600),
    ]);
    const response = await get("region=asia&items=T5_BAG,T4_BAG");
    expect(response.status).toBe(200);
    expect(mocks.prices).toHaveBeenCalledTimes(1);
    expect(mocks.prices).toHaveBeenCalledWith("asia", ["T5_BAG", "T4_BAG"], 1);
    const body = itemPricesResponse.parse(await response.json());
    expect(body.region).toBe("asia");
    // Sorted by item, then city; the Black Market and empty sides are left out.
    expect(body.orders).toEqual([
      { item: "T4_BAG", city: "Caerleon", price: 450, observedAt: ago(600) },
      { item: "T4_BAG", city: "Lymhurst", price: 500, observedAt: ago(5) },
      { item: "T5_BAG", city: "Martlock", price: 900, observedAt: ago(5) },
    ]);
  });
  it("says so when the source is down, with no price substituted", async () => {
    mocks.prices.mockRejectedValue(new Error("budget"));
    const response = await get("region=europe&items=T4_BAG");
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("No prices substituted");
  });
});

describe("cheapestSellOrder", () => {
  const order = (city: string, price: number, minutes: number) => ({
    item: "T4_BAG",
    city,
    price,
    observedAt: ago(minutes),
  });
  it("picks the lowest current order, never a cheaper stale one", () => {
    expect(
      cheapestSellOrder(
        [order("Lymhurst", 100, 300), order("Martlock", 700, 5), order("Thetford", 600, 50)],
        now,
      ),
    ).toEqual({ ...order("Thetford", 600, 50), stale: false });
  });
  it("falls back to the lowest stale order, flagged stale", () => {
    expect(
      cheapestSellOrder([order("Lymhurst", 900, 120), order("Martlock", 800, 3000)], now),
    ).toEqual({ ...order("Martlock", 800, 3000), stale: true });
  });
  it("skips the Black Market and has nothing to show without an order", () => {
    expect(cheapestSellOrder([order("Black Market", 50, 1)], now)).toBeNull();
    expect(cheapestSellOrder([], now)).toBeNull();
  });
});

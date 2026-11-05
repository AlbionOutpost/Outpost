import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), history: vi.fn(), kills: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true, redis: () => null }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
vi.mock("../src/lib/albion/history-client", () => ({ getHistory: mocks.history }));
vi.mock("../src/lib/albion/priced-top-kills", () => ({ pricedTopKills: mocks.kills }));

const observed = "2026-11-05T10:00:00";
const quote = (item_id: string, city: string, sell_price_min: number, buy_price_max = 0) => ({
  item_id,
  quality: 1,
  city,
  sell_price_min,
  sell_price_min_date: observed,
  buy_price_max,
  buy_price_max_date: observed,
});
const rows = [
  quote("T6_METALBAR", "Black Market", 50),
  quote("T6_METALBAR", "Martlock", 400, 350),
  quote("T6_METALBAR", "Lymhurst", 380, 300),
  quote("T6_METALBAR", "Thetford", 0, 320),
  quote("T4_CAPE", "Lymhurst", 2000),
  quote("T6_POTION_HEAL", "Martlock", 900),
  // The fully priced craft: T4 battleaxe in Lymhurst only.
  quote("T4_METALBAR", "Lymhurst", 100),
  quote("T4_PLANKS", "Lymhurst", 50),
  quote("T4_MAIN_AXE", "Lymhurst", 3000),
];
const feed = {
  region: "europe",
  events: [],
  fetchedAt: observed,
  source: "Albion Online Game Info",
  since: observed,
  window: { days: 7 },
};
const get = async (query: string) => {
  const { GET } = await import("../src/app/api/landing/route");
  return GET(new NextRequest(`http://localhost/api/landing${query}`));
};

describe("GET /api/landing", () => {
  beforeEach(() => {
    mocks.prices.mockReset();
    mocks.history.mockReset();
    mocks.kills.mockReset();
  });

  it("answers every homepage preview from one price batch, history in the cheapest city", async () => {
    mocks.prices.mockResolvedValue(rows);
    mocks.history.mockResolvedValue([
      {
        location: "Lymhurst",
        item_id: "T6_METALBAR",
        quality: 1,
        data: [{ item_count: 10, avg_price: 390, timestamp: observed }],
      },
    ]);
    mocks.kills.mockResolvedValue(feed);
    const response = await get("?region=europe");
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Outpost-Partial")).toBeNull();
    const body = await response.json();

    // One upstream price call: the market item, the plan and every craft input/output, quality 1.
    expect(mocks.prices).toHaveBeenCalledTimes(1);
    const [region, ids, quality] = mocks.prices.mock.calls[0];
    expect(region).toBe("europe");
    expect(quality).toBe(1);
    expect(ids).toEqual(expect.arrayContaining(["T6_METALBAR", "T4_CAPE", "T6_POTION_HEAL"]));
    expect(ids).toEqual(expect.arrayContaining(["T4_MAIN_AXE", "T4_PLANKS", "T6_BAG"]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(50);

    // Each observation keeps its own city and time; the Black Market is not the cheapest city.
    expect(body.market).toMatchObject({ ok: true, item: "T6_METALBAR" });
    expect(body.market.prices).toHaveLength(4);
    expect(body.market.prices.every((p: { item_id: string }) => p.item_id === "T6_METALBAR")).toBe(
      true,
    );
    expect(mocks.history).toHaveBeenCalledWith("europe", "T6_METALBAR", "Lymhurst", 1);
    expect(body.history).toEqual({
      ok: true,
      item: "T6_METALBAR",
      city: "Lymhurst",
      data: [{ item_count: 10, avg_price: 390, timestamp: observed }],
    });
    expect(body.planner.ok).toBe(true);
    expect(body.planner.prices.map((p: { item_id: string }) => p.item_id).sort()).toEqual([
      "T4_CAPE",
      "T6_POTION_HEAL",
    ]);
    // Same calculation as /api/landing/craft (see landing-craft-route.test.ts).
    expect(body.craft).toMatchObject({
      ok: true,
      batches: 1,
      best: { recipe: { id: "battleaxe-t4" }, city: "Lymhurst", complete: true, upfront: 2000 },
    });
    expect(body.craft.best.profit).toBeCloseTo(2805 - 200000 / 118, 9);
    expect(body.kills).toEqual({ ok: true, ...feed });
  });

  it("fails each part on its own and marks the answer partial", async () => {
    mocks.prices.mockResolvedValue(rows);
    mocks.history.mockRejectedValue(new Error("upstream"));
    mocks.kills.mockRejectedValue(new Error("game info down"));
    const response = await get("?region=asia");
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Outpost-Partial")).toBe("1");
    const body = await response.json();
    expect(body.market.ok).toBe(true);
    expect(body.craft.ok).toBe(true);
    expect(body.planner.ok).toBe(true);
    expect(body.history).toEqual({
      ok: false,
      city: "Lymhurst",
      error: "Historical observations are unavailable. No data has been substituted.",
    });
    expect(body.kills).toEqual({
      ok: false,
      error: "Albion’s kill feed is unavailable right now.",
    });
  });

  it("keeps history and kills when the price batch fails, without substituting prices", async () => {
    mocks.prices.mockRejectedValue(new Error("rate limited"));
    mocks.history.mockResolvedValue([]);
    mocks.kills.mockResolvedValue(feed);
    const response = await get("?region=americas");
    expect(response.headers.get("X-Outpost-Partial")).toBe("1");
    const body = await response.json();
    for (const part of ["market", "craft", "planner"]) {
      expect(body[part].ok).toBe(false);
      expect(body[part].error).toMatch(/unavailable/i);
      expect(body[part]).not.toHaveProperty("prices");
    }
    // No city has a listing, so the chart falls back to Bridgewatch, which has no history yet.
    expect(mocks.history).toHaveBeenCalledWith("americas", "T6_METALBAR", "Bridgewatch", 1);
    expect(body.history).toEqual({ ok: true, item: "T6_METALBAR", city: "Bridgewatch", data: [] });
    expect(body.kills.ok).toBe(true);
  });

  it("rejects an unknown server before any upstream call", async () => {
    const response = await get("?region=mars");
    expect(response.status).toBe(400);
    expect(mocks.prices).not.toHaveBeenCalled();
    expect(mocks.kills).not.toHaveBeenCalled();
  });
});

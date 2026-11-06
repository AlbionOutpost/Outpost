import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ events: vi.fn(), prices: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true, redis: () => null }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
vi.mock("../src/lib/albion/combat-events", () => ({
  getCombatEvents: mocks.events,
  getTopKills: vi.fn(),
}));
import { pricedCombatEvents } from "../src/lib/albion/priced-top-kills";

const player = (pieces: [string, string | null, number | null][]) => ({
  id: "p",
  name: "Player",
  guild: "",
  alliance: "",
  itemPower: null,
  equipment: pieces.map(([slot, itemId, quality]) => ({ slot, itemId, quality })),
});
const event = (id: number, pieces: [string, string | null, number | null][]) => ({
  id,
  occurredAt: "2026-11-06T10:00:00Z",
  killer: player([]),
  victim: player(pieces),
  fame: 1000 * id,
  participants: 1,
});
const quote = (item_id: string, quality: number, city: string, sell: number, ageDays = 0) => ({
  item_id,
  quality,
  city,
  sell_price_min: sell,
  sell_price_min_date: new Date(Date.now() - ageDays * 86400_000).toISOString(),
  buy_price_max: 0,
  buy_price_max_date: new Date().toISOString(),
});

describe("pricedCombatEvents", () => {
  beforeEach(() => {
    mocks.events.mockReset();
    mocks.prices.mockReset();
  });

  it("prices every victim's worn gear in one pass and keeps the feed's order", async () => {
    mocks.events.mockResolvedValue({
      region: "europe",
      offset: 0,
      source: "Albion Online Game Info",
      fetchedAt: new Date().toISOString(),
      events: [
        event(1, [
          ["Main hand", "T4_MAIN_AXE", 2],
          ["Helmet", "T4_HEAD_PLATE_SET1", null],
          ["Boots", null, null],
        ]),
        event(2, [["Main hand", "T8_2H_CLAYMORE", 1]]),
      ],
    });
    mocks.prices.mockResolvedValue([
      quote("T4_MAIN_AXE", 2, "Martlock", 9000),
      quote("T4_MAIN_AXE", 2, "Lymhurst", 7000),
      // Black Market and week-old listings say nothing about the gear's value
      quote("T4_HEAD_PLATE_SET1", 1, "Black Market", 1),
      quote("T8_2H_CLAYMORE", 1, "Martlock", 5_000_000, 8),
    ]);
    const feed = await pricedCombatEvents("europe", 0);
    expect(mocks.prices).toHaveBeenCalledTimes(1);
    expect(mocks.prices.mock.calls[0][1].sort()).toEqual([
      "T4_HEAD_PLATE_SET1",
      "T4_MAIN_AXE",
      "T8_2H_CLAYMORE",
    ]);
    expect(feed.events.map((e) => e.id)).toEqual([1, 2]);
    expect(feed.events[0].gearValue).toEqual({ total: 7000, priced: 1, missing: 1 });
    expect(feed.events[1].gearValue).toBeNull();
  });

  it("leaves gear unpriced when the price source fails, and still returns the feed", async () => {
    mocks.events.mockResolvedValue({
      region: "europe",
      offset: 20,
      source: "Albion Online Game Info",
      fetchedAt: new Date().toISOString(),
      events: [event(3, [["Main hand", "T4_MAIN_AXE", 1]])],
    });
    mocks.prices.mockRejectedValue(new Error("budget"));
    const feed = await pricedCombatEvents("europe", 20);
    expect(feed.offset).toBe(20);
    expect(feed.events[0].gearValue).toBeNull();
  });

  it("propagates an unavailable feed", async () => {
    mocks.events.mockRejectedValue(new Error("Combat source unavailable"));
    await expect(pricedCombatEvents("europe", 0)).rejects.toThrow("Combat source unavailable");
  });
});

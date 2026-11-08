import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
const obs = (item_id: string, city: string, quality: number, sell: number, buy = 0) => ({
  item_id,
  city,
  quality,
  sell_price_min: sell,
  sell_price_min_date: "2026-11-08T10:00:00",
  buy_price_max: buy,
  buy_price_max_date: "2026-11-08T10:00:00",
});
beforeEach(() => mocks.prices.mockReset());

describe("craft finder data", () => {
  it("prices one category, tier and enchantment in one bounded batch", async () => {
    mocks.prices.mockResolvedValue([
      obs("T6_METALBAR", "Lymhurst", 1, 100),
      obs("T6_METALBAR", "Lymhurst", 2, 999),
      obs("T6_MAIN_SWORD", "Martlock", 2, 3000),
      obs("T6_MAIN_SWORD", "Martlock", 1, 2000),
      obs("T6_LEATHER", "Lymhurst", 1, 0, 0),
    ]);
    const { GET } = await import("../src/app/api/economy/crafts/route");
    const r = await GET(
      new NextRequest(
        "http://localhost/api/economy/crafts?region=europe&category=sword&tier=6&enchantment=0&quality=2",
      ),
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(mocks.prices).toHaveBeenCalledTimes(1);
    const [region, items, qualities] = mocks.prices.mock.calls[0];
    expect(region).toBe("europe");
    expect(qualities).toEqual([1, 2]);
    expect(items.length).toBeLessThanOrEqual(48);
    expect(items).toEqual(expect.arrayContaining(["T6_MAIN_SWORD", "T6_METALBAR", "T6_LEATHER"]));
    // Primary recipes only: no token alternatives (~2), every one a T6.0 sword.
    expect(b.recipes.length).toBeGreaterThan(5);
    expect(
      b.recipes.every((x: { id: string; tier: number }) => !x.id.includes("~") && x.tier === 6),
    ).toBe(true);
    // Materials at quality 1 and outputs at the chosen quality; empty rows dropped.
    expect(b.prices).toEqual([
      obs("T6_METALBAR", "Lymhurst", 1, 100),
      obs("T6_MAIN_SWORD", "Martlock", 2, 3000),
    ]);
    expect(b).toMatchObject({ region: "europe", quality: 2, source: "Albion Online Data Project" });
  });
  it("keeps consumables at quality 1 and rejects unknown categories", async () => {
    mocks.prices.mockResolvedValue([]);
    const { GET } = await import("../src/app/api/economy/crafts/route");
    const r = await GET(
      new NextRequest(
        "http://localhost/api/economy/crafts?region=asia&category=food&tier=6&enchantment=0&quality=4",
      ),
    );
    expect((await r.json()).quality).toBe(1);
    expect(mocks.prices.mock.calls[0][2]).toBe(1);
    const bad = await GET(
      new NextRequest(
        "http://localhost/api/economy/crafts?region=asia&category=mounts&tier=6&enchantment=0&quality=1",
      ),
    );
    expect(bad.status).toBe(400);
  });
});

describe("Black Market board data", () => {
  it("lists the category's gear over the tier range and returns every city's observations", async () => {
    mocks.prices.mockResolvedValue([
      obs("T5_MAIN_SWORD", "Black Market", 3, 0, 5000),
      obs("T5_MAIN_SWORD", "Lymhurst", 3, 4000),
      obs("T5_MAIN_SWORD", "Martlock", 3, 0, 0),
    ]);
    const { GET } = await import("../src/app/api/economy/black-market/route");
    const r = await GET(
      new NextRequest(
        "http://localhost/api/economy/black-market?region=americas&category=sword&fromTier=4&toTier=5&enchantment=0&quality=3",
      ),
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(mocks.prices).toHaveBeenCalledTimes(1);
    expect(mocks.prices.mock.calls[0][2]).toBe(3);
    const ids = b.items.map((i: { id: string }) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining(["T4_MAIN_SWORD", "T5_MAIN_SWORD", "T5_2H_CLAYMORE"]),
    );
    expect(ids.every((id: string) => /^T[45]_/.test(id) && !id.includes("@"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(b.prices).toHaveLength(2);
    expect(b.total).toBe(b.items.length);
  });
  it("rejects an upside-down tier range and consumables", async () => {
    const { GET } = await import("../src/app/api/economy/black-market/route");
    for (const q of ["category=sword&fromTier=6&toTier=4", "category=food&fromTier=4&toTier=6"])
      expect(
        (
          await GET(
            new NextRequest(
              `http://localhost/api/economy/black-market?region=europe&${q}&enchantment=0&quality=1`,
            ),
          )
        ).status,
      ).toBe(400);
    expect(mocks.prices).not.toHaveBeenCalled();
  });
});

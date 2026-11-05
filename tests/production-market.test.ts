import { it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: mocks.limit }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
it("queries refined materials only at Normal quality even for a legacy quality parameter", async () => {
  mocks.limit.mockResolvedValue(true);
  mocks.prices.mockReset().mockResolvedValue([]);
  const { GET } = await import("../src/app/api/economy/prices/route");
  const params = new URLSearchParams({
    kind: "refining",
    region: "americas",
    recipeId: "steel-bar-t4",
    materialCity: "Lymhurst",
    outputCity: "Lymhurst",
    quality: "5",
    enchantFamily: "MAIN_AXE",
    tier: "4",
    fromEnchant: "0",
    toEnchant: "1",
  });
  const response = await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`));
  expect(response.status).toBe(200);
  expect((await response.json()).prices.T4_METALBAR.quality).toBe(1);
  expect(mocks.prices).toHaveBeenCalledExactlyOnceWith(
    "americas",
    ["T4_ORE", "T3_METALBAR", "T4_METALBAR"],
    1,
  );
});
it("batches production inputs by quality and selects explicit region and markets", async () => {
  mocks.limit.mockResolvedValue(true);
  mocks.prices.mockImplementation(async (_region: string, items: string[], quality: number) =>
    items.flatMap((item_id) => [
      {
        item_id,
        quality,
        city: "Lymhurst",
        sell_price_min: 100,
        sell_price_min_date: "2020-01-01T00:00:00",
      },
      {
        item_id,
        quality,
        city: "Caerleon",
        sell_price_min: 200,
        sell_price_min_date: "2020-01-02T00:00:00",
      },
    ]),
  );
  const { GET } = await import("../src/app/api/economy/prices/route");
  const params = new URLSearchParams({
    kind: "crafting",
    region: "asia",
    recipeId: "battleaxe-t4",
    materialCity: "Lymhurst",
    outputCity: "Caerleon",
    quality: "3",
    enchantFamily: "MAIN_AXE",
    tier: "4",
    fromEnchant: "0",
    toEnchant: "1",
  });
  const response = await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.prices.T4_METALBAR).toMatchObject({
    value: 100,
    quality: 1,
    city: "Lymhurst",
    region: "asia",
    manual: false,
  });
  expect(body.prices.T4_MAIN_AXE).toMatchObject({
    value: 200,
    quality: 3,
    city: "Caerleon",
    region: "asia",
  });
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_METALBAR", "T4_PLANKS"], 1);
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_MAIN_AXE"], 3);
  mocks.prices.mockResolvedValue([]);
  const missing = await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`));
  expect((await missing.json()).prices.T4_METALBAR.value).toBeNull();
  // Upstream protection lives in the data client (per-region source budget), so a busy
  // site never blocks a visitor whose request is served from cache.
  mocks.prices.mockRejectedValue(
    new Error("Data source request budget exhausted. Please retry later."),
  );
  const exhausted = await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`));
  expect(exhausted.status).toBe(503);
});
it("prices Black Market output from its highest buy order and keeps missing bids missing", async () => {
  mocks.limit.mockResolvedValue(true);
  mocks.prices
    .mockReset()
    .mockImplementation(async (_region: string, items: string[], quality: number) =>
      items.map((item_id) => ({
        item_id,
        quality,
        city: item_id === "T4_MAIN_AXE" ? "Black Market" : "Lymhurst",
        sell_price_min: 5000,
        sell_price_min_date: "2026-01-01T00:00:00",
        buy_price_max: item_id === "T4_MAIN_AXE" ? 3000 : 90,
        buy_price_max_date: "2026-01-02T00:00:00",
      })),
    );
  const { GET } = await import("../src/app/api/economy/prices/route");
  const params = new URLSearchParams({
    kind: "crafting",
    region: "europe",
    recipeId: "battleaxe-t4",
    materialCity: "Lymhurst",
    outputCity: "Black Market",
    quality: "1",
    enchantFamily: "MAIN_AXE",
    tier: "4",
    fromEnchant: "0",
    toEnchant: "1",
  });
  const body = await (
    await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`))
  ).json();
  // Materials are bought instantly from asks; the Black Market output sells instantly into bids.
  expect(body.prices.T4_METALBAR).toMatchObject({
    value: 5000,
    observedAt: "2026-01-01T00:00:00",
    execution: "instant-purchase",
  });
  expect(body.prices.T4_MAIN_AXE).toMatchObject({
    value: 3000,
    observedAt: "2026-01-02T00:00:00",
    execution: "instant-sale",
    city: "Black Market",
  });
  mocks.prices.mockResolvedValue([
    {
      item_id: "T4_MAIN_AXE",
      quality: 1,
      city: "Black Market",
      sell_price_min: 5000,
      sell_price_min_date: "2026-01-01T00:00:00",
      buy_price_max: 0,
      buy_price_max_date: "0001-01-01T00:00:00",
    },
  ]);
  const missing = await (
    await GET(new NextRequest(`http://localhost/api/economy/prices?${params}`))
  ).json();
  expect(missing.prices.T4_MAIN_AXE).toMatchObject({ value: null, observedAt: null });
});

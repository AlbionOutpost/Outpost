import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/redis", () => ({ rateLimit: mocks.limit }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
it("uses the exact 18/118 base return rate, not a rounded 15.3%", async () => {
  mocks.limit.mockResolvedValue(true);
  const observed = new Date().toISOString();
  // Only the T4 battleaxe is fully priced, and only in Lymhurst.
  mocks.prices.mockResolvedValue(
    Object.entries({ T4_METALBAR: 100, T4_PLANKS: 50, T4_MAIN_AXE: 3000 }).map(
      ([item_id, sell_price_min]) => ({
        item_id,
        quality: 1,
        city: "Lymhurst",
        sell_price_min,
        sell_price_min_date: observed,
      }),
    ),
  );
  const { GET } = await import("../src/app/api/landing/craft/route");
  const body = await (
    await GET(new NextRequest("http://localhost/api/landing/craft?region=europe&batches=1"))
  ).json();
  expect(body.assumptions.returnRate).toBe(1800 / 118);
  expect(body.best).toMatchObject({
    recipe: { id: "battleaxe-t4" },
    city: "Lymhurst",
    complete: true,
    upfront: 2000,
    revenue: 3000,
    fees: 195,
  });
  // 16 bars × 100 + 8 planks × 50 = 2,000; 18/118 returned leaves 2,000 × 100/118 = 1,694.915…
  // 3,000 − 195 (4% tax + 2.5% setup) − 1,694.915… = 1,110.0847… (a rounded 15.3% gave 1,111).
  expect(body.best.profit).toBeCloseTo(2805 - 200000 / 118, 9);
  expect(body.best.margin).toBeCloseTo(((2805 - 200000 / 118) / 3000) * 100, 9);
});

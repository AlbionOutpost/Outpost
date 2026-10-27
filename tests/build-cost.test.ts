import { it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), build: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ db: { build: { findUnique: mocks.build } } }));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
it("separates quality batches and returns incomplete totals instead of zero prices", async () => {
  mocks.build.mockResolvedValue({
    authorId: "author",
    visibility: "PUBLIC",
    equipment: [
      { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1 },
      { slot: "Helmet", itemId: "T4_HEAD_CLOTH_SET1", quality: 2 },
    ],
  });
  mocks.prices.mockImplementation(async (_region: string, _items: string[], quality: number) =>
    quality === 1
      ? [
          {
            item_id: "T4_MAIN_AXE",
            quality: 1,
            city: "Lymhurst",
            sell_price_min: 100,
            sell_price_min_date: "2020-01-01T00:00:00",
          },
        ]
      : [],
  );
  const { GET } = await import("../src/app/api/builds/[id]/cost/route");
  const response = await GET(
    new NextRequest("http://localhost/api/builds/test/cost?region=asia&city=Lymhurst&sets=3"),
    { params: Promise.resolve({ id: "test" }) },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.knownCost).toBe(300);
  expect(body.total).toBeNull();
  expect(body.rows[1].price).toBeNull();
  expect(body.stale).toBe(true);
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_MAIN_AXE"], 1);
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_HEAD_CLOTH_SET1"], 2);
});

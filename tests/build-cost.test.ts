import { it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn(), build: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ db: { build: { findUnique: mocks.build } } }));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));
it("batches explicit qualities and returns incomplete totals instead of substituting another quality", async () => {
  mocks.build.mockResolvedValue({
    authorId: "author",
    visibility: "PUBLIC",
    equipment: [
      { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1 },
      { slot: "Helmet", itemId: "T4_HEAD_CLOTH_SET1", quality: 2 },
    ],
  });
  mocks.prices.mockResolvedValue([
    {
      item_id: "T4_MAIN_AXE",
      quality: 1,
      city: "Lymhurst",
      sell_price_min: 100,
      sell_price_min_date: "2020-01-01T00:00:00",
    },
    {
      item_id: "T4_HEAD_CLOTH_SET1",
      quality: 1,
      city: "Lymhurst",
      sell_price_min: 75,
      sell_price_min_date: "2020-01-01T00:00:00",
    },
  ]);
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
  expect(mocks.prices).toHaveBeenCalledTimes(1);
  expect(mocks.prices).toHaveBeenCalledWith("asia", ["T4_MAIN_AXE", "T4_HEAD_CLOTH_SET1"], [1, 2]);
});
it("returns explicit unsupported totals without rounding source prices or replacement-set products", async () => {
  const equipment = [
    { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1 },
    { slot: "Helmet", itemId: "T4_HEAD_CLOTH_SET1", quality: 1 },
    { slot: "Cape", itemId: "T4_CAPE", quality: 1 },
  ];
  mocks.build.mockResolvedValue({ authorId: "author", visibility: "PUBLIC", equipment });
  mocks.prices.mockResolvedValue(
    equipment.map((item) => ({
      item_id: item.itemId,
      quality: 1,
      city: "Lymhurst",
      sell_price_min: Number.MAX_SAFE_INTEGER,
      sell_price_min_date: "2020-01-01T00:00:00Z",
    })),
  );
  const { GET } = await import("../src/app/api/builds/[id]/cost/route");
  for (const sets of [1, 2]) {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/builds/test/cost?region=europe&city=Lymhurst&sets=${sets}`,
      ),
      { params: Promise.resolve({ id: "test" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ knownCost: null, total: null, unsupportedRange: true });
    expect(body.rows.map((row: { price: number }) => row.price)).toEqual(
      Array(3).fill(Number.MAX_SAFE_INTEGER),
    );
  }
});

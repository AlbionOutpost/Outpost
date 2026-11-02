import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ prices: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/albion/market-client", () => ({ getPrices: mocks.prices }));

it("preserves ask/bid execution provenance and source timestamps for journals and loot", async () => {
  mocks.prices.mockImplementation(async (_region: string, ids: string[]) =>
    ids.map((item_id) => ({
      item_id,
      quality: 1,
      city: "Lymhurst",
      sell_price_min: 1000,
      buy_price_max: 100,
      sell_price_min_date: "2026-11-01T11:00:00Z",
      buy_price_max_date: "2026-11-01T12:00:00Z",
    })),
  );
  const { GET } = await import("../src/app/api/laborers/prices/route");
  const query = new URLSearchParams({
    region: "europe",
    type: "WARRIOR",
    journalTier: "4",
    journalCity: "Lymhurst",
    lootCity: "Lymhurst",
    saleMode: "listing",
    buyOrder: "false",
  });
  const listingResponse = await GET(
    new NextRequest(`http://localhost/api/laborers/prices?${query}`),
  );
  expect(listingResponse.status).toBe(200);
  const listing = await listingResponse.json();
  expect(listing.prices.T4_JOURNAL_WARRIOR_FULL).toMatchObject({
    value: 1000,
    execution: "instant-purchase",
    observedAt: "2026-11-01T11:00:00Z",
  });
  expect(listing.prices.T4_METALBAR).toMatchObject({ value: 1000, execution: "listing" });
  query.set("saleMode", "instant");
  query.set("buyOrder", "true");
  const instantResponse = await GET(
    new NextRequest(`http://localhost/api/laborers/prices?${query}`),
  );
  const instant = await instantResponse.json();
  expect(instant.prices.T4_JOURNAL_WARRIOR_FULL).toMatchObject({
    value: 100,
    execution: "buy-order",
    observedAt: "2026-11-01T12:00:00Z",
  });
  expect(instant.prices.T4_METALBAR).toMatchObject({
    value: 100,
    execution: "instant-sale",
    observedAt: "2026-11-01T12:00:00Z",
  });
  expect(instant.prices.T4_JOURNAL_WARRIOR_EMPTY.execution).toBe("instant-sale");
});

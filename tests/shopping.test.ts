import { describe, it, expect } from "vitest";
import {
  mergeShopping,
  mergeShoppingQuotes,
  shoppingListSchema,
  savedShoppingSchema,
  shoppingFromProduction,
  shoppingSummary,
  type ShoppingEntry,
} from "@/lib/albion/shopping";
const row: ShoppingEntry = {
  itemId: "T4_MAIN_AXE",
  name: "Battleaxe",
  city: "Fort Sterling",
  quality: 1,
  quantity: 10,
  owned: 3,
  unitPrice: 100,
  priceKind: "manual",
  observedAt: null,
};
const list = { version: 1 as const, region: "europe" as const, entries: [row] };
describe("inventory-aware shopping", () => {
  it("buys only the shortfall without pretending owned items are a market observation", () => {
    const r = shoppingSummary(list);
    expect(r.total).toBe(700);
    expect(r.remainingItems).toBe(7);
  });
  it("requires a price for every purchase but not for fully owned equipment", () => {
    expect(shoppingSummary({ ...list, entries: [{ ...row, unitPrice: null }] }).total).toBe(null);
    expect(
      shoppingSummary({ ...list, entries: [{ ...row, owned: 10, unitPrice: null }] }).total,
    ).toBe(0);
  });
  it("keeps stale observations incomplete and intentional manual zero valid", () => {
    expect(
      shoppingSummary({
        ...list,
        entries: [{ ...row, priceKind: "observed", observedAt: "2020-01-01T00:00:00Z" }],
      }).missing,
    ).toBe(1);
    expect(shoppingSummary({ ...list, entries: [{ ...row, unitPrice: 0 }] }).total).toBe(0);
  });
  it("combines matching requirements while keeping market and quality identities separate", () => {
    const r = mergeShopping(
      list,
      [
        { ...row, quantity: 2, owned: 0 },
        { ...row, city: "Lymhurst" },
        { ...row, quality: 2 },
      ],
      "europe",
    );
    expect(r.entries).toHaveLength(3);
    expect(r.entries[0].quantity).toBe(12);
    expect(r.entries[0].owned).toBe(3);
    expect(() => mergeShopping(list, [row], "asia")).toThrow();
  });
  it("rejects negative inventory, duplicate rows, unknown fields and unsafe totals", () => {
    for (const entries of [
      [{ ...row, owned: -1 }],
      [row, row],
      [{ ...row, secret: "unexpected" }],
      [{ ...row, quantity: 1000000, unitPrice: 1000000000 }],
    ])
      expect(shoppingListSchema.safeParse({ ...list, entries }).success).toBe(false);
  });
  it("rejects cross-server and oversized account snapshots without changing device-list support", () => {
    expect(
      savedShoppingSchema.safeParse({ kind: "shopping-list", region: "asia", list }).success,
    ).toBe(false);
    expect(
      savedShoppingSchema.safeParse({ kind: "shopping-list", region: "europe", list }).success,
    ).toBe(true);
    const largeList = {
      ...list,
      entries: Array.from({ length: 101 }, (_, i) => ({ ...row, itemId: `T4_TEST_${i}` })),
    };
    expect(shoppingListSchema.safeParse(largeList).success).toBe(true);
    expect(
      savedShoppingSchema.safeParse({ kind: "shopping-list", region: "europe", list: largeList })
        .success,
    ).toBe(false);
  });
  it("preserves gross purchase quantities and stale observation status when a plan becomes a list", () => {
    const entries = shoppingFromProduction([
      {
        id: row.itemId,
        name: row.name,
        city: row.city,
        quality: 1,
        quantity: 10,
        gross: 1000,
        sources: new Set(["Observed 2020-01-01T00:00:00Z", "Manual input"]),
      },
    ]);
    expect(entries[0].quantity).toBe(10);
    expect(entries[0].owned).toBe(0);
    expect(entries[0].unitPrice).toBe(100);
    expect(shoppingSummary({ ...list, entries }).missing).toBe(1);
  });
});

it("preserves price edits while a shopping refresh is pending, including a cleared manual price", () => {
  const requested = {
    ...row,
    priceKind: "observed" as const,
    observedAt: new Date().toISOString(),
  };
  const current = {
    ...list,
    entries: [{ ...requested, unitPrice: null, priceKind: "manual" as const }],
  };
  const quotes = [
    {
      itemId: row.itemId,
      quality: 1,
      prices: [
        {
          item_id: row.itemId,
          quality: 1,
          city: row.city,
          sell_price_min: 200,
          sell_price_min_date: new Date().toISOString(),
          buy_price_max: 0,
          buy_price_max_date: "",
        },
      ],
    },
  ];
  expect(mergeShoppingQuotes(current, [requested], quotes).entries[0].unitPrice).toBeNull();
  const changed = mergeShoppingQuotes(
    { ...list, entries: [{ ...requested, owned: 5 }] },
    [requested],
    quotes,
  );
  expect(changed.entries[0].unitPrice).toBe(200);
  expect(changed.entries[0].owned).toBe(5);
  expect(
    mergeShoppingQuotes(
      { ...list, entries: [{ ...requested, city: "Lymhurst" }] },
      [requested],
      quotes,
    ).entries[0].unitPrice,
  ).toBe(100);
});
it("does not turn a source zero sentinel or Black Market purchase into a free priced line", () => {
  expect(
    shoppingSummary({
      ...list,
      entries: [
        { ...row, unitPrice: 0, priceKind: "observed", observedAt: new Date().toISOString() },
      ],
    }).total,
  ).toBeNull();
  expect(
    shoppingSummary({ ...list, entries: [{ ...row, city: "Black Market" }] }).total,
  ).toBeNull();
});

it("keeps the oldest plan observation even when a newer one has a timezone offset", () => {
  const entries = shoppingFromProduction([
    {
      id: row.itemId,
      name: row.name,
      city: row.city,
      quality: 1,
      quantity: 1,
      gross: 100,
      sources: new Set([
        "Observed " + new Date().toISOString().replace("Z", "+00:00"),
        "Observed 2020-01-01T00:00:00Z",
      ]),
    },
  ]);
  expect(entries[0].observedAt).toBe("2020-01-01T00:00:00Z");
  expect(shoppingSummary({ ...list, entries }).total).toBeNull();
});

import { expect, it } from "vitest";
import { summarizeLoadoutQuotes } from "../src/lib/albion/loadout-quotes";
const now = Date.parse("2026-10-28T12:00:00Z");
const equipment = [
  { itemId: "T4_BAG", quality: 1 },
  { itemId: "T4_CAPE", quality: 2 },
];
const row = {
  item_id: "T4_BAG",
  quality: 1,
  city: "Fort Sterling",
  sell_price_min: 100,
  sell_price_min_date: "2026-10-28T11:30:00Z",
  buy_price_max: 0,
  buy_price_max_date: "0001-01-01T00:00:00",
};
it("retains a labelled older estimate rather than treating an existing scan as missing", () => {
  const result = summarizeLoadoutQuotes(
    equipment,
    {
      "T4_BAG:1": { prices: [row] },
      "T4_CAPE:2": {
        prices: [
          {
            ...row,
            item_id: "T4_CAPE",
            quality: 2,
            sell_price_min: 250,
            sell_price_min_date: "2026-10-27T12:00:00Z",
          },
        ],
      },
    },
    "Fort Sterling",
    now,
  );
  expect(result).toMatchObject({
    total: 350,
    knownCost: 350,
    priced: 2,
    recent: 1,
    stale: 1,
    missing: 0,
  });
});
it("missing, zero and other-quality/city/item scans cannot complete a loadout", () => {
  const prices = [
    { ...row, sell_price_min: 0 },
    { ...row, quality: 2 },
    { ...row, city: "Lymhurst" },
    { ...row, item_id: "T4_CAPE" },
  ];
  expect(
    summarizeLoadoutQuotes(equipment, { "T4_BAG:1": { prices } }, "Fort Sterling", now),
  ).toMatchObject({ total: null, knownCost: 0, missing: 2 });
});
it("keeps incomplete known subtotals separate, counts repeated slots and refuses NPC purchases", () => {
  const quotes = { "T4_BAG:1": { prices: [row], error: "Refresh unavailable" } };
  expect(summarizeLoadoutQuotes(equipment, quotes, "Fort Sterling", now)).toMatchObject({
    total: null,
    knownCost: 100,
    priced: 1,
    missing: 1,
    failed: 1,
  });
  expect(
    summarizeLoadoutQuotes([equipment[0], equipment[0]], quotes, "Fort Sterling", now).total,
  ).toBe(200);
  expect(
    summarizeLoadoutQuotes(
      [equipment[0]],
      { "T4_BAG:1": { prices: [{ ...row, city: "Black Market" }] } },
      "Black Market",
      now,
    ).total,
  ).toBeNull();
});
it("retains individual observations but refuses an unsafe whole-silver aggregate", () => {
  const quote = { ...row, sell_price_min: Number.MAX_SAFE_INTEGER };
  const result = summarizeLoadoutQuotes(
    [equipment[0], equipment[0], equipment[0]],
    { "T4_BAG:1": { prices: [quote] } },
    "Fort Sterling",
    now,
  );
  expect(result).toMatchObject({ knownCost: null, total: null, priced: 3, missing: 0 });
  expect(result.rows.map((row) => row.observation?.sell_price_min)).toEqual([
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ]);
});

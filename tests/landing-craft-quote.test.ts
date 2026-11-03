import { describe, expect, it } from "vitest";
import { resizeCraftQuote, type LandingCraftQuote } from "@/lib/landing-craft-quote";
const quote: LandingCraftQuote = {
  batches: 1,
  candidates: 1,
  assumptions: { returnRate: 15.3 },
  best: {
    recipe: { id: "example", name: "Test fixture", output: "T4_CAPE" },
    city: "Lymhurst",
    rows: [{ id: "T4_CLOTH", name: "Cloth", quantity: 4, unit: 100, gross: 400 }],
    outputQuantity: 1,
    complete: true,
    missing: [],
    upfront: 400,
    fees: 39,
    revenue: 600,
    profit: 222.2,
    margin: (222.2 / 600) * 100,
  },
  byCity: [
    { city: "Lymhurst", profit: 222.2, margin: (222.2 / 600) * 100 },
    { city: "Bridgewatch", profit: -50, margin: -10 },
  ],
};
describe("quantity-only landing craft quote", () => {
  it("scales quantities and totals with the recorded unit prices, returns and fees", () => {
    const twelve = resizeCraftQuote(quote, 12);
    // 48 cloth at100, output12 at600,15.3% material credit and6.5% sales fees.
    expect(twelve.best.rows[0]).toMatchObject({ quantity: 48, unit: 100, gross: 4800 });
    expect(twelve.best.upfront).toBe(4800);
    expect(twelve.best.revenue).toBe(7200);
    expect(twelve.best.fees).toBe(468);
    expect(twelve.best.profit).toBeCloseTo(7200 - 468 - 4800 * (1 - 0.153));
    expect(twelve.byCity[1].profit).toBe(-600);
    expect(twelve.best.margin).toBe(quote.best.margin);
    expect(resizeCraftQuote(twelve, 1).best.profit).toBeCloseTo(quote.best.profit!);
    expect(quote.best.rows[0].quantity).toBe(4);
  });
  it("preserves unavailable prices and rejects invalid quantities", () => {
    const incomplete = {
      ...quote,
      best: {
        ...quote.best,
        complete: false,
        missing: ["T4_CLOTH"],
        upfront: null,
        profit: null,
        rows: [{ ...quote.best.rows[0], unit: null, gross: null }],
      },
    };
    expect(resizeCraftQuote(incomplete, 2).best).toMatchObject({
      complete: false,
      upfront: null,
      profit: null,
      rows: [{ unit: null, gross: null, quantity: 8 }],
    });
    for (const value of [0, 51, 1.5, NaN]) expect(() => resizeCraftQuote(quote, value)).toThrow();
  });
});

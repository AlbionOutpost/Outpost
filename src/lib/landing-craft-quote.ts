export type LandingCraftQuote = {
  batches: number;
  candidates: number;
  assumptions?: { returnRate: number };
  best: {
    recipe: { id: string; name: string; output: string };
    city: string;
    rows: {
      id: string;
      name: string;
      quantity: number;
      unit: number | null;
      gross: number | null;
    }[];
    outputQuantity: number;
    complete: boolean;
    missing: string[];
    upfront: number | null;
    fees: number | null;
    revenue: number | null;
    profit: number | null;
    margin: number | null;
  };
  byCity: { city: string; profit: number; margin: number }[];
  unpriced?: string[];
};

/** Quantity-only projection of the same observations and assumptions.
 * Production's fixed recipe, return %, fees and station charge are linear in batches;
 * unit prices, margin, missing/stale state and city ranking stay unchanged.
 */
export function resizeCraftQuote(quote: LandingCraftQuote, batches: number): LandingCraftQuote {
  if (
    !Number.isInteger(batches) ||
    batches < 1 ||
    batches > 50 ||
    !Number.isInteger(quote.batches) ||
    quote.batches < 1
  )
    throw new Error("Invalid batch quantity");
  const ratio = batches / quote.batches;
  const scale = (value: number | null) => (value === null ? null : value * ratio);
  return {
    ...quote,
    batches,
    best: {
      ...quote.best,
      rows: quote.best.rows.map((row) => ({
        ...row,
        quantity: row.quantity * ratio,
        gross: scale(row.gross),
      })),
      outputQuantity: quote.best.outputQuantity * ratio,
      upfront: scale(quote.best.upfront),
      fees: scale(quote.best.fees),
      revenue: scale(quote.best.revenue),
      profit: scale(quote.best.profit),
    },
    byCity: quote.byCity.map((city) => ({ ...city, profit: city.profit * ratio })),
  };
}

/**
 * Market sales tax: 4% with Premium, 8% without (owner decision, 8 Nov 2026). Every calculator's
 * sales-tax field starts at the Premium rate and offers both as quick choices; the value stays an
 * editable assumption, and a saved scenario or link keeps the rate it carries.
 */
export const PREMIUM_SALES_TAX = 4;
export const NO_PREMIUM_SALES_TAX = 8;
export const DEFAULT_SALES_TAX = PREMIUM_SALES_TAX;
export const salesTaxPresets = [
  { label: "Premium 4%", value: PREMIUM_SALES_TAX },
  { label: "No premium 8%", value: NO_PREMIUM_SALES_TAX },
] as const;
